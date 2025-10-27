import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get session ID from request body
    let sessionId = crypto.randomUUID();
    try {
      const body = await req.json();
      sessionId = body.session_id || sessionId;
    } catch {
      // If no body, use generated session ID
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const verifaliaUsername = Deno.env.get('VERIFALIA_USERNAME');
    const verifaliaPassword = Deno.env.get('VERIFALIA_PASSWORD');
    if (!verifaliaUsername || !verifaliaPassword) {
      throw new Error('Verifalia credentials not configured');
    }

    // Create Basic Auth header for Verifalia
    const authHeader = `Basic ${btoa(`${verifaliaUsername}:${verifaliaPassword}`)}`;

    console.log('Starting email generation process with session:', sessionId);

    const toGenerate = 25;
    console.log(`Will generate ${toGenerate} emails`);

    // Get all names
    const { data: names, error: namesError } = await supabase
      .from('names')
      .select('first_name, last_name');

    if (namesError || !names || names.length === 0) {
      console.error('Error fetching names:', namesError);
      throw new Error('No names available in database');
    }

    // Get already generated emails to avoid duplicates
    const { data: existingEmails } = await supabase
      .from('generated_emails')
      .select('email');

    const existingEmailSet = new Set(existingEmails?.map(e => e.email) || []);
    console.log(`Found ${existingEmailSet.size} existing emails`);

    const generatedEmails = [];
    const emailProviders = [
      'gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com'
    ];
    
    // Get failed emails to avoid retrying them
    const { data: failedEmailsList } = await supabase
      .from('failed_emails')
      .select('email');
    
    const failedEmailsSet = new Set(failedEmailsList?.map(e => e.email) || []);
    console.log(`Found ${failedEmailsSet.size} previously failed emails to skip`);
    
    let attempts = 0;
    const maxAttempts = toGenerate * 20;

    while (generatedEmails.length < toGenerate && attempts < maxAttempts) {
      attempts++;
      
      // Check for stop signal
      const { data: stopSignal } = await supabase
        .from('generation_stop_signals')
        .select('session_id')
        .eq('session_id', sessionId)
        .maybeSingle();
      
      if (stopSignal) {
        console.log('Stop signal received, halting generation');
        break;
      }
      
      // Pick random name
      const randomName = names[Math.floor(Math.random() * names.length)];
      const provider = emailProviders[Math.floor(Math.random() * emailProviders.length)];
      
      // Generate email with variations (numbers, dots, underscores)
      const firstName = randomName.first_name.toLowerCase();
      const lastName = randomName.last_name.toLowerCase();
      const randomNum = Math.floor(Math.random() * 9999);
      
      // Random variation patterns
      const patterns = [
        `${firstName}${lastName}${randomNum}`,
        `${firstName}.${lastName}${randomNum}`,
        `${firstName}_${lastName}${randomNum}`,
        `${firstName}${lastName.charAt(0)}${randomNum}`,
        `${firstName.charAt(0)}${lastName}${randomNum}`,
      ];
      
      const pattern = patterns[Math.floor(Math.random() * patterns.length)];
      const email = `${pattern}@${provider}`;

      // Check if email already exists or previously failed
      if (existingEmailSet.has(email) || failedEmailsSet.has(email)) {
        continue;
      }

      // Log that we're testing this email
      await supabase
        .from('generation_logs')
        .insert({
          session_id: sessionId,
          email,
          status: 'testing'
        });

      console.log(`Testing email: ${email}`);

      // Verify email with Verifalia
      try {
        const verifyResponse = await fetch(
          'https://api.verifalia.com/v2.7/email-validations?waitTime=30000',
          {
            method: 'POST',
            headers: {
              'Authorization': authHeader,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              entries: [
                { inputData: email }
              ],
              quality: 'Standard'
            })
          }
        );

        if (!verifyResponse.ok) {
          const errorText = await verifyResponse.text();
          console.error(`FAILED - ${email} - Status ${verifyResponse.status}: ${errorText}`);
          
          // Check if it's a credit/quota error (402 Payment Required or 429 Too Many Requests)
          if (verifyResponse.status === 402 || verifyResponse.status === 429) {
            console.log('Credit limit reached or rate limit hit, stopping generation');
            
            await supabase
              .from('generation_logs')
              .insert({
                session_id: sessionId,
                email,
                status: 'failed',
                reason: `Credits exhausted or rate limited: ${verifyResponse.status}`
              });
            
            break; // Stop the loop
          }
          
          // Log failure
          await supabase
            .from('generation_logs')
            .insert({
              session_id: sessionId,
              email,
              status: 'failed',
              reason: `API Error: ${verifyResponse.status} - ${errorText}`
            });
          
          // Store failed email
          await supabase
            .from('failed_emails')
            .insert({
              email,
              reason: `API Error: ${verifyResponse.status} - ${errorText}`
            })
            .select()
            .single();
          
          failedEmailsSet.add(email);
          continue;
        }

        const verificationResult = await verifyResponse.json();
        
        // Check if job is still in progress (HTTP 202) - if so, skip this email
        if (verificationResult.overview?.status === 'InProgress') {
          console.log(`SKIPPED - ${email} - Verification still in progress`);
          continue;
        }

        // Get the first entry from the results
        const entry = verificationResult.entries?.data?.[0];
        if (!entry) {
          console.error(`FAILED - ${email} - No verification entry returned`);
          failedEmailsSet.add(email);
          continue;
        }

        // Map Verifalia classification to our validation logic
        const classification = entry.classification; // "Deliverable", "Undeliverable", "Risky", "Unknown"
        const status = entry.status; // e.g., "Success", "DomainDoesNotExist", etc.
        const isFreeEmail = entry.isFreeEmailAddress === true;
        const isDisposable = entry.isDisposableEmailAddress === true;
        const isRoleAccount = entry.isRoleAccount === true;
        
        // Consider email deliverable if:
        // - Classification is "Deliverable"
        // - Not a disposable email
        // - Status is "Success"
        const isDeliverable = classification === 'Deliverable' && 
                             !isDisposable && 
                             status === 'Success';
        
        const isVerified = classification === 'Deliverable' || classification === 'Risky';

        // Only add emails that pass all validation checks
        if (isDeliverable) {
          console.log(`SUCCESS - ${email} - Classification: ${classification}, Status: ${status}, Free: ${isFreeEmail}, Disposable: ${isDisposable}`);
          
          // Log success
          await supabase
            .from('generation_logs')
            .insert({
              session_id: sessionId,
              email,
              status: 'success',
              reason: `Classification: ${classification}, Status: ${status}`
            });
          
          generatedEmails.push({
            email,
            first_name: randomName.first_name,
            last_name: randomName.last_name,
            is_verified: isVerified,
            is_deliverable: isDeliverable,
            verification_status: JSON.stringify(entry),
            verified_at: new Date().toISOString()
          });

          existingEmailSet.add(email);
        } else {
          const failReason = `Classification: ${classification}, Status: ${status}, Disposable: ${isDisposable}, Role: ${isRoleAccount}`;
          console.log(`FAILED - ${email} - ${failReason}`);
          
          // Log failure
          await supabase
            .from('generation_logs')
            .insert({
              session_id: sessionId,
              email,
              status: 'failed',
              reason: failReason
            });
          
          // Store failed email
          await supabase
            .from('failed_emails')
            .insert({
              email,
              reason: failReason
            })
            .select()
            .single();
          
          failedEmailsSet.add(email);
        }
      } catch (verifyError: any) {
        console.error(`ERROR - ${email} - ${verifyError.message}`);
        
        // Log error
        await supabase
          .from('generation_logs')
          .insert({
            session_id: sessionId,
            email,
            status: 'failed',
            reason: `Exception: ${verifyError.message}`
          });
        
        // Store failed email
        await supabase
          .from('failed_emails')
          .insert({
            email,
            reason: `Exception: ${verifyError.message}`
          })
          .select()
          .single();
        
        failedEmailsSet.add(email);
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    console.log(`Generated ${generatedEmails.length} emails`);

    if (generatedEmails.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Failed to generate any valid emails', generated: 0 }), 
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Insert generated emails
    const { error: insertError } = await supabase
      .from('generated_emails')
      .insert(generatedEmails);

    if (insertError) {
      console.error('Error inserting emails:', insertError);
      throw insertError;
    }

    console.log('Email generation completed successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        generated: generatedEmails.length,
        deliverable: generatedEmails.filter(e => e.is_deliverable).length,
        verified: generatedEmails.filter(e => e.is_verified).length
      }), 
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in generate-emails function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }), 
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
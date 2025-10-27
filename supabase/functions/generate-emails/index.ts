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

    const emailDetectiveKey = Deno.env.get('ABSTRACTAPI_KEY');
    if (!emailDetectiveKey) {
      throw new Error('ABSTRACTAPI_KEY not configured');
    }

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

      // Verify email with EmailDetective.io
      try {
        const verifyResponse = await fetch(
          `https://api.emaildetective.io/emails/${encodeURIComponent(email)}`,
          {
            headers: {
              'Authorization': `Bearer ${emailDetectiveKey}`
            }
          }
        );

        if (!verifyResponse.ok) {
          const errorText = await verifyResponse.text();
          console.error(`FAILED - ${email} - Status ${verifyResponse.status}: ${errorText}`);
          
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

        const verificationData = await verifyResponse.json();

        // Check if email is valid and deliverable
        const isValidEmail = verificationData.valid_email === true;
        const hasValidMX = verificationData.valid_mx === true;
        const isNotDisposable = verificationData.disposable === false;
        const hasGoodScore = verificationData.score >= 80; // Require score of at least 80
        const isLowSuspicion = verificationData.suspicion_rating !== 'HIGH'; // Reject HIGH suspicion emails
        
        const isDeliverable = isValidEmail && hasValidMX && isNotDisposable && hasGoodScore && isLowSuspicion;
        const isVerified = isValidEmail && hasValidMX;

        // Only add emails that pass all validation checks including score and suspicion rating
        if (isDeliverable) {
          console.log(`SUCCESS - ${email} - Score: ${verificationData.score}, Suspicion: ${verificationData.suspicion_rating}, Valid: ${isValidEmail}, MX: ${hasValidMX}`);
          
          // Log success
          await supabase
            .from('generation_logs')
            .insert({
              session_id: sessionId,
              email,
              status: 'success',
              reason: `Score: ${verificationData.score}, Suspicion: ${verificationData.suspicion_rating}`
            });
          
          generatedEmails.push({
            email,
            first_name: randomName.first_name,
            last_name: randomName.last_name,
            is_verified: isVerified,
            is_deliverable: isDeliverable,
            verification_status: JSON.stringify(verificationData),
            verified_at: new Date().toISOString()
          });

          existingEmailSet.add(email);
        } else {
          const failReason = `Score: ${verificationData.score}, Suspicion: ${verificationData.suspicion_rating}, Valid: ${isValidEmail}, MX: ${hasValidMX}`;
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
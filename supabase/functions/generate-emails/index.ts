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
    // Get session ID, count, max API requests, and pattern options from request body
    let sessionId = crypto.randomUUID();
    let toGenerate = 25;
    let maxApiRequests = 50;
    let patterns = {
      useFirstName: true,
      useLastName: true,
      includeNumbers: true,
      includeDots: true,
      useAbbreviations: true,
      use2DigitsOnly: false
    };
    let categories = {
      useNames: true,
      useCompanyNames: false,
      useSportsTerms: false,
      useCommonWords: false
    };
    let regions = {
      western: true,
      british: true,
      finnish: true,
      swedish: true,
      norwegian: true,
      danish: true,
      irish: true,
      scottish: true,
      welsh: true,
      dutch: true,
      german: true,
      indian: true,
      arabic: true,
      jewish: true,
      pakistani: true,
      african: true
    };
    
    try {
      const body = await req.json();
      sessionId = body.session_id || sessionId;
      toGenerate = body.count || 25;
      maxApiRequests = body.max_api_requests || 50;
      if (body.patterns) patterns = { ...patterns, ...body.patterns };
      if (body.categories) categories = { ...categories, ...body.categories };
      if (body.regions) regions = { ...regions, ...body.regions };
    } catch {
      // If no body, use defaults
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
    console.log(`Will generate ${toGenerate} emails with max ${maxApiRequests} API requests`);
    console.log('Patterns:', patterns);
    console.log('Categories:', categories);
    console.log('Regions:', regions);

    // Fetch data based on selected categories
    const dataSources: any = {};
    
    if (categories.useNames) {
      // Build region filter
      const selectedRegions = Object.entries(regions)
        .filter(([_, enabled]) => enabled)
        .map(([region, _]) => region);
      
      if (selectedRegions.length === 0) {
        throw new Error('At least one name region must be selected');
      }
      
      const { data: names, error: namesError } = await supabase
        .from('names')
        .select('first_name, last_name, region')
        .in('region', selectedRegions);
      if (!namesError && names && names.length > 0) {
        dataSources.names = names;
        console.log(`Loaded ${names.length} names from regions: ${selectedRegions.join(', ')}`);
      }
    }
    
    if (categories.useCompanyNames) {
      const { data: companies, error: companiesError } = await supabase
        .from('company_names')
        .select('name');
      if (!companiesError && companies && companies.length > 0) {
        dataSources.companies = companies;
      }
    }
    
    if (categories.useSportsTerms) {
      const { data: sports, error: sportsError } = await supabase
        .from('sports_terms')
        .select('term');
      if (!sportsError && sports && sports.length > 0) {
        dataSources.sports = sports;
      }
    }
    
    if (categories.useCommonWords) {
      const { data: words, error: wordsError } = await supabase
        .from('common_words')
        .select('word');
      if (!wordsError && words && words.length > 0) {
        dataSources.words = words;
      }
    }
    
    // Check if we have at least one data source
    if (Object.keys(dataSources).length === 0) {
      throw new Error('No data sources available. Please select at least one category.');
    }
    
    console.log('Available data sources:', Object.keys(dataSources));

    // Get already generated emails to avoid duplicates
    const { data: existingEmails } = await supabase
      .from('generated_emails')
      .select('email');

    const existingEmailSet = new Set(existingEmails?.map(e => e.email) || []);
    console.log(`Found ${existingEmailSet.size} existing emails`);

    const generatedEmails = [];
    const emailProviders = [
      'gmail.com', 'outlook.com', 'hotmail.com', 'icloud.com'
    ];
    
    // Get failed emails to avoid retrying them
    const { data: failedEmailsList } = await supabase
      .from('failed_emails')
      .select('email');
    
    const failedEmailsSet = new Set(failedEmailsList?.map(e => e.email) || []);
    console.log(`Found ${failedEmailsSet.size} previously failed emails to skip`);
    
    let attempts = 0;
    let apiRequestCount = 0;

    while (generatedEmails.length < toGenerate && attempts < (toGenerate * 20) && apiRequestCount < maxApiRequests) {
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
      
      // Generate email based on selected patterns and categories
      let emailParts: string[] = [];
      let sourceData: any = null;
      
      // Pick a random category from available sources
      const availableSources = Object.keys(dataSources);
      const randomSource = availableSources[Math.floor(Math.random() * availableSources.length)];
      
      // Generate email parts based on the selected source
      if (randomSource === 'names' && dataSources.names) {
        const randomName = dataSources.names[Math.floor(Math.random() * dataSources.names.length)];
        sourceData = randomName;
        
        if (patterns.useFirstName && patterns.useLastName) {
          // Combine first and last name in various ways
          const firstName = randomName.first_name.toLowerCase();
          const lastName = randomName.last_name.toLowerCase();
          
          const namePatterns = [];
          if (!patterns.useAbbreviations || Math.random() > 0.5) {
            namePatterns.push(`${firstName}${lastName}`);
            if (patterns.includeDots) namePatterns.push(`${firstName}.${lastName}`);
            namePatterns.push(`${firstName}_${lastName}`);
          }
          if (patterns.useAbbreviations) {
            namePatterns.push(`${firstName}${lastName.charAt(0)}`);
            namePatterns.push(`${firstName.charAt(0)}${lastName}`);
          }
          
          emailParts.push(namePatterns[Math.floor(Math.random() * namePatterns.length)]);
        } else if (patterns.useFirstName) {
          emailParts.push(randomName.first_name.toLowerCase());
        } else if (patterns.useLastName) {
          emailParts.push(randomName.last_name.toLowerCase());
        }
      } else if (randomSource === 'companies' && dataSources.companies) {
        const randomCompany = dataSources.companies[Math.floor(Math.random() * dataSources.companies.length)];
        emailParts.push(randomCompany.name.toLowerCase());
      } else if (randomSource === 'sports' && dataSources.sports) {
        const randomSport = dataSources.sports[Math.floor(Math.random() * dataSources.sports.length)];
        emailParts.push(randomSport.term.toLowerCase());
      } else if (randomSource === 'words' && dataSources.words) {
        const randomWord = dataSources.words[Math.floor(Math.random() * dataSources.words.length)];
        emailParts.push(randomWord.word.toLowerCase());
      }
      
      // Add numbers if enabled (2-4 digits only, realistic patterns)
      if (patterns.includeNumbers) {
        let randomNum;
        if (patterns.use2DigitsOnly) {
          randomNum = Math.floor(Math.random() * 90) + 10; // 10-99 (only 2 digits)
        } else {
          randomNum = Math.floor(Math.random() * 9990) + 10; // 10-9999 (2-4 digits)
        }
        emailParts.push(randomNum.toString());
      }
      
      // Join parts
      const provider = emailProviders[Math.floor(Math.random() * emailProviders.length)];
      const email = `${emailParts.join('')}@${provider}`;

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

      console.log(`Testing email: ${email} (API request ${apiRequestCount + 1}/${maxApiRequests})`);

      // Check if we've reached the API request limit
      if (apiRequestCount >= maxApiRequests) {
        console.log(`Reached API request limit of ${maxApiRequests}, stopping generation`);
        break;
      }

      // Verify email with Verifalia
      apiRequestCount++;
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
            first_name: sourceData?.first_name || 'N/A',
            last_name: sourceData?.last_name || 'N/A',
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

    console.log(`Generated ${generatedEmails.length} emails using ${apiRequestCount} API requests`);

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
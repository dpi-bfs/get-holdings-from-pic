// Remote libraries
import { OneBlinkAPIHostingRequest, OneBlinkAPIHostingResponse } from '@oneblink/cli'
import * as OneBlinkSdk from '@oneblink/sdk'
import Boom from '@hapi/boom'

// Local libraries
import * as ProjectTypes from './projectTypes.mjs'
import * as HttpWrapper from './LocalLibrary/httpWrapper.js'

export async function post(
  request: OneBlinkAPIHostingRequest<{
    definition: Record<string, any>
    element: Record<string, any>
    submission: Record<string, string>
  }>,
  response: OneBlinkAPIHostingResponse<any>
) {
  console.time('totalLookupTimeUntilJustBeforeReturn');
  const triggerElementName = request.body.element.name;
  console.log("triggerElementName", triggerElementName);
  
  if (!request || !request.body || !request.body.submission) {
    throw Boom.badRequest('submission missing')
  }
  const { submission } = request.body

  const triggerElementValue = submission[triggerElementName]
  console.log(triggerElementName, triggerElementValue);

  if (!triggerElementValue) {
    throw Boom.badRequest(`${triggerElementName} isn't giving us a value: ${triggerElementValue}`)
  }

  let url, data, headers;

  try {

    url = process.env.PIC_VALIDATION_URL!;
    data = {
      element: { name: triggerElementName},
      submission: {
        [triggerElementName]: triggerElementValue
      }
    }
    console.log(`${triggerElementName} url`, url);
    console.log(`${triggerElementName} data`, data);
    const picValidationPromise = HttpWrapper.postRequest(url, data, headers)
      .catch(error => {
        return error instanceof Error ? error : new Error('Unknown error in picValidationPromise');
      });

    url = process.env.POWER_AUTOMATE_HTTP_POST_URL!;
    data = { Pic: triggerElementValue };
    headers = { "x-global-get-holdings-secret-key": process.env.POWER_AUTOMATE_SECRET_KEY! }
    const holdingsPromise: Promise<ProjectTypes.Holding[] | Error> = HttpWrapper.postRequest<ProjectTypes.Holding[] | Error>(url, data, headers)
      .catch(error => {
        return error instanceof Error ? error : new Error('Unknown error in holdings fetch');
      });

    const [picValidationPromiseResult, holdingsPromiseResult] = await Promise.all([picValidationPromise, holdingsPromise]);  

    console.log("picValidationPromiseResult", JSON.stringify(picValidationPromiseResult));
    console.log("holdingsPromiseResult", JSON.stringify(holdingsPromiseResult));

    if (picValidationPromiseResult instanceof Error) {
      throw picValidationPromiseResult
      // throw Boom.badRequest('Bad picValidationPromiseResult', picValidationPromiseResult)
    }

    if (holdingsPromiseResult instanceof Error) {
      // throw Boom.badRequest('Bad holdingsPromiseResult', holdingsPromiseResult)
      throw holdingsPromiseResult

    } else if (Array.isArray(holdingsPromiseResult) && holdingsPromiseResult.length === 0) {
  
      const TheSingleDynamicElement = 
          OneBlinkSdk.Forms.generateFormElement({
            name: 'PropertyHoldingsInfo',
            label: 'PropertyHoldingsInfo',
            type: 'html', // An info element
            customCssClasses: ['info-warning'],
            defaultValue: `We could not find holdings associated with ${triggerElementValue}. If that PIC number is wrong, re-enter the right number in ${triggerElementName} and click [Lookup]. Otherwise continue to fill out the form.`
          })
  
      // We need to return an array of elements, even for a single element.    
      const dynamicElements = [
        TheSingleDynamicElement
      ]
      console.log('dynamicElements', JSON.stringify(dynamicElements));
      console.log('picValidationPromiseResult', picValidationPromiseResult);
      console.timeEnd('totalLookupTimeUntilJustBeforeReturn');
      return response.setStatusCode(200).setPayload(dynamicElements)

    } else {
       // Object values
       const holdingsAsOptions = holdingsPromiseResult.map((holding: ProjectTypes.Holding) => ({
        label: `${holding.HoldingNumber} | ${holding.StreetAddress} | ${holding.City} | ${holding.State} | ${holding.PostCode} | ${holding.CentroidLat} ${holding.CentroidLong}`,
        value: JSON.stringify(holding),
      }))
  
      console.log('holdingsAsOptions', holdingsAsOptions);
  
      const TheSingleDynamicElement = 
          OneBlinkSdk.Forms.generateFormElement({
            name: 'PropertyHoldings',
            label: 'Property holdings',
            // type: 'select',
            type: 'checkboxes',
            // hint: 'Select all of the holdings where cattle tick was detected. If there is only one holding, select that. To select multiple holdings, hold the ctrl key (on Macs the command key) down and either: click with your mouse; or use keyboard arrows and space bar.', // for select
            hint: 'Select all of the holdings where cattle tick was detected. If there is only one holding, select that.',
            hintPosition: 'BELOW_LABEL',
            required: true,
            requiredAll: false,
            canToggleAll: true,
            // multi: true,   // For select   
            options: holdingsAsOptions
          })
  
      // We need to return an array of elements, even for a single element.    
      const dynamicElements = [
        TheSingleDynamicElement
      ]
      console.log('dynamicElements', JSON.stringify(dynamicElements));
      console.log('picValidationPromiseResult', picValidationPromiseResult);
      console.timeEnd('totalLookupTimeUntilJustBeforeReturn');
      return response.setStatusCode(200).setPayload(dynamicElements)
    }

    // Returning a well formed object, without error codes, is enough for the OneBlink UI's Data lookup element
    // to register this as valid.
    // return {} 

    // If we wanted to return values to other elements we'd do something like the following
    // return { 
    //   "TempPicDataTarget": JSON.stringify(submission),
    //   "OtherElement": "Some Value"
    // } 


  } catch (e) {
    console.error('First line of index catch', e)
    // console.log('First line of index catch. e.message', e.message);
    // const invalidMessageToOneBlinkForm = 
    // `Invalid Property Identification Code (PIC). Was not found in the National Livestock Identification System (NLIS) PIC Register.`
    // const invalidMessageToOneBlinkForm = "404 error"

    // As this gets inserted into a <p>, use:
    // <br /><br /> if you want paragraphs; and
    // <br /> if you want an end of line
      
    let invalidMessageToOneBlinkForm;
    if (e.message) {

      // We are expecting a packet like 
      // e.message = {"statusCode":400,"error":"Bad Request","message":"Invalid Property Identification Code (PIC). Was not found in the National Livestock Identification System (NLIS) PIC Register."}
      console.error('e.message', e);
      const errorMessageBody = JSON.parse(e.message);
      console.error('errorMessageBody.message', errorMessageBody.message);
      invalidMessageToOneBlinkForm = errorMessageBody.message;
      throw Boom.badRequest(invalidMessageToOneBlinkForm);

    } else if (e instanceof Boom.Boom && e.output && (e.output.statusCode === 404 || e.output.statusCode === 400) )  {
      const invalidMessageToOneBlinkForm = 'Some Boom 404 or 400 error'
      throw Boom.badRequest(invalidMessageToOneBlinkForm)

    } else if (e instanceof Boom.Boom && e.output && e.output.statusCode === 502 && e.message.includes("The server did not receive a response from an upstream server")) {
      throw Boom.badRequest(`${triggerElementName} with value ${triggerElementValue} could not be found in the database.`)

    } else {
      console.error('Uncaught error', e);
      throw Boom.badImplementation('Uncaught error');
    }
  }
}
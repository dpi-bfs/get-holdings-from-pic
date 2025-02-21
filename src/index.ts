import { OneBlinkAPIHostingRequest, OneBlinkAPIHostingResponse } from '@oneblink/cli'
import * as OneBlinkSdk from '@oneblink/sdk'
import Boom from '@hapi/boom'
// import * as Globals from './globals.js'
// import * as HttpWrapper from './BfsLibrary/httpWrapper.js'
// import * as PermitTypes from './permitTypes.mjs'
// import * as FormLookupReturnPacket from './formLookupReturnPacket.js'

import * as HttpWrapper from './LocalLibrary/httpWrapper.js'

export async function post(
  request: OneBlinkAPIHostingRequest<{
    definition: Record<string, any>
    element: Record<string, any>
    submission: Record<string, string>
  }>,
  response: OneBlinkAPIHostingResponse<any>
) {
  console.log("hello world");
  const triggerElementName = request.body.element.name;
  console.log("triggerElementName", triggerElementName);
  
  if (!request || !request.body || !request.body.submission) {
    throw Boom.badRequest('submission missing')
  }
  const { submission } = request.body

  const PropertyPic = submission["PropertyPic"]
  console.log("PropertyPic", PropertyPic);

  if (!PropertyPic) {
    throw Boom.badRequest(`"PropertyPic isn't giving us a value: ${PropertyPic}`)
  }

  try {
    const url = process.env.POWER_AUTOMATE_HTTP_POST_URL!;
    const data = { Pic: PropertyPic };
    const headers = { "x-global-get-holdings-secret-key": process.env.POWER_AUTOMATE_SECRET_KEY! }

    const powerAutomateResponseJson = await HttpWrapper.postData(url, data, headers)
    if (!powerAutomateResponseJson) {
      throw Boom.badRequest('Could not get a powerAutomateResponseJson in time. Please try again.')
    } 

    // Returning a well formed object, without error codes, is enough for the OneBlink UI's Data lookup element
    // to register this as valid.
    // return {} 

    // If we wanted to return values to other elements we'd do something like the following
    // return { 
    //   "TempPicDataTarget": JSON.stringify(submission),
    //   "OtherElement": "Some Value"
    // } 
    console.log("powerAutomateResponseJson", JSON.stringify(powerAutomateResponseJson));

    const payload = { 
        "TempHoldingsText": JSON.stringify(powerAutomateResponseJson),
        "PropertyHoldings": [
          {
            "value": "Holding  01",
            "label": "Holding  01"
          },
          {
            "value": "Holding  02",
            "label": "Holding  02"
          }
        ]
    }

    const warehouses = [
      {
        warehouseNumber: '1',
        assets: ['crane', 'forklift', 'hammer', 'drill'],
      },
      {
        warehouseNumber: '2',
        assets: ['lightsaber', 'pod-racer seat', 'hyper-drive'],
      },
    ]
    const warehouseNumber = '1'
    const warehouse = warehouses.find(
      (warehouse) => warehouse.warehouseNumber === warehouseNumber,
    )

    const TheSingleDynamicElement = 
        OneBlinkSdk.Forms.generateFormElement({
          name: 'MyRadio',
          label: `My Radio`,
          type: 'radio',
          buttons: true,
          required: true,      
          options: [
            {
              value: 'Holding  01',
              label: 'Holding  01',
              displayAlways: true
            },
            {
              value: 'Holding  02',
              label: 'Holding  02',
              displayAlways: true
            }
          ],
        })

    // We need to return an array of elements, even for a single element.    
    const dynamicElements = [
      TheSingleDynamicElement
    ]
    console.log('dynamicElements', JSON.stringify(dynamicElements));
    return response.setStatusCode(200).setPayload(dynamicElements)

  } catch (e) {
    if (e instanceof Boom.Boom && e.output && e.output.statusCode === 404) {
      
      // As this gets inserted into a <p>, use:
      // <br /><br /> if you want paragraphs; and
      // <br /> if you want an end of line
      
      // const invalidMessage = 
      // `Invalid Property Identification Code (PIC). Was not found in the National Livestock Identification System (NLIS) PIC Register.`
      const invalidMessage = "404 error"
      throw Boom.badRequest(invalidMessage)

    } else if (e instanceof Boom.Boom && e.output && e.output.statusCode === 502 && e.message.includes("The server did not receive a response from an upstream server")) {
      throw Boom.badRequest(`The PropertyPic ${PropertyPic} could not be found in the database.`)


    } else {
      console.error(e);
      throw Boom.badImplementation('uncaught error');
    }
  }
}
/**
@param {string} recipient - phone number
@param {string} text - message body
@param {object} context - additional authorization context
@param {string} context.message_type - 'sms' or 'voice'
@param {string} context.action - 'enrollment' or 'second-factor-authentication'
@param {string} context.language - language used by login flow
@param {string} context.code - one time password
@param {string} context.ip - ip address
@param {string} context.user_agent - user agent making the authentication request
@param {object} context.client - object with details about the Auth0 application
@param {string} context.client.client_id - Auth0 application ID
@param {string} context.client.name - Auth0 application name
@param {object} context.client.client_metadata - metadata from client (optional)
@param {object} context.user - object representing the user
@param {string} context.user.user_id - Auth0 user ID
@param {string} context.user.name - user name
@param {string} context.user.email - user email
@param {object} context.user.app_metadata - metadata specific to user and application
@param {object} context.user.user_metadata - metadata specific to user
@param {function} cb - function (error, response)
*/
module.exports = function(toNumber, text, context, cb) {
  
  const Vonage = require('@vonage/server-sdk');

  const vonage = new Vonage({
    apiKey: context.webtask.secrets.VONAGE_API_KEY,
    apiSecret: context.webtask.secrets.VONAGE_API_SECRET,
    applicationId: context.webtask.secrets.VONAGE_APPLICATION_ID,
    privateKey: context.webtask.secrets.VONAGE_APPLICATION_PRIVATE_KEY_STR
  });
  
  toNumber = toNumber.replace(/\D/g, '');
  
  
  //NUMBER INSIGHTS
  vonage.numberInsight.get({level: 'basic', number: toNumber}, (error, result) => {
    if(error) {
      return cb(new Error('Message failed: Number Insights ERROR - ' + error));
    }
    else {
      if(result["status"] == 0){
        toNumber = result["international_format_number"];
        //return cb(new Error('Message failed: NI SUCCESS - ' + result["international_format_number"]));
        
        //VOICE
        if(context.message_type == "voice"){
          vonage.calls.create({
            to: [{
              type: 'phone',
              number: toNumber
            }],
            from: {
              type: 'phone',
              number: context.webtask.secrets.VONAGE_NUMBER
            },
            ncco: [{
              "action": "talk",
              "text": text,
              "language": "ja-JP",
              "style": 0
            }]
          }, (error, response) => {
            if (error) {
              return cb(new Error('Message failed: ' + error));
            }
            
            return cb(null, {});
          });
        }
        else{
          const opts = {
            "type": "unicode"
          }

          vonage.message.sendSms(context.webtask.secrets.VONAGE_BRAND_NAME, toNumber, text, opts, (err, responseData) => {
              if (err) {
                  return cb(err);
              }
              
              if(responseData.messages[0]['status'] !== "0") {
                  return cb(new Error('Message failed: ' + responseData.messages[0]['error-text']));
              } 
              
              return cb(null, {});
          })
        }
      }
      else{
        return cb(new Error('Message failed: INVALID NUMBER - ' + result.status_message));
      }
    }
  });


  
};

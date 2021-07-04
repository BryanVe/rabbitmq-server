require('dotenv').config()
const amqp = require('amqplib/callback_api');
const axios = require('axios')

const PORT =  process.env.PORT
const QUEUE_NAME = process.env.QUEUE_NAME
const QUEUE_URI = process.env.QUEUE_URI
const BASE_URL = `${process.env.BASE_URL}:${PORT}`

axios.defaults.baseURL = BASE_URL;

amqp.connect(QUEUE_URI, (error, connection) => {
  if (error)
    throw error;

  connection.createChannel((error, channel) => {
    if (error)
      throw error;

    channel.assertQueue(QUEUE_NAME, {
      durable: false
    });
    channel.prefetch(1);
    console.log('[x] Awaiting RPC requests');
    
    channel.consume(QUEUE_NAME, async message => {
      const receivedMessage = message.content.toString()
      const receivedMessageAsJson = JSON.parse(receivedMessage)
      console.log("[.] message received on server:", receivedMessageAsJson);

      const {
        url,
        method,
        data
      } = receivedMessageAsJson

      let result
      try {
        const response = await axios({
          method,
          url,
          data
        })
        
        result = response.data
      } catch (error) {
        result = error.response.data
      }
      
      console.log(result)
      const responseMessage = JSON.stringify(result)
      channel.sendToQueue(
        message.properties.replyTo,
        Buffer.from(responseMessage),
        {
          correlationId: message.properties.correlationId
        }
      );

      channel.ack(message);
    });
  });
});

// const matchParamsOnUri = (uri, params) => {
//   const slicedUri = uri.replace(':').split('/')
//   const matchParamsOnUri = slicedUri.map(element => params[element] ? params[element] : element)

//   return matchParamsOnUri.join('/')
// }
#!/usr/bin/env node

var amqp = require('amqplib/callback_api');

amqp.connect('amqp://0.0.0.0', (error, connection) => {
  if (error)
    throw error;

  connection.createChannel((error, channel) => {
    if (error)
      throw error;

    channel.assertQueue('', {
      exclusive: true
    }, (error, q) => {
      if (error)
        throw error

      const correlationId = generateUuid();
      const mockedJsonMessage = {
        url: '/users',
        method: 'post',
        data: {
          name: "Random",
          lastname: "User",
          email: "randus@uni.pe",
          code: "20184312A",
          cycle: 10
        }
      }
      const message = JSON.stringify(mockedJsonMessage)
      console.log('[x] requesting response for:', mockedJsonMessage);

      channel.consume(q.queue, msg => {
        if (msg.properties.correlationId == correlationId) {
          console.log('[.] response:', JSON.parse(msg.content.toString()));
          setTimeout(function() {
            connection.close();
            process.exit(0)
          }, 500);
        }
      }, {
        noAck: true
      });

      channel.sendToQueue('rpc_queue',
        Buffer.from(message.toString()),
        {
          correlationId: correlationId,
          replyTo: q.queue });
        }
      );
  });
});

const generateUuid = () => 
        Math.random().toString() +
        Math.random().toString() +
        Math.random().toString()
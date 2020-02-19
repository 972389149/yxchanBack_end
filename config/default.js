module.exports = {
    port: 3000,
    session: {
      secret: 'e-commerce',
      key: 'e-commerce',
      maxAge: 1000 * 60 * 30
    },
    mongodb: 'mongodb://localhost:27666/yuxichan'
  };
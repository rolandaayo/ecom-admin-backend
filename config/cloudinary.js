const { v2: cloudinary } = require('cloudinary');

cloudinary.config({
  cloud_name: 'dzasnyq4y',
  api_key: '869877488851136',
  api_secret: 'I8xBaIIqyw3lm4G0anlsDpbyCD0'
});

// Test the configuration
cloudinary.api.ping()
  .then(result => {
    console.log('Cloudinary connection successful:', result);
  })
  .catch(error => {
    console.error('Cloudinary connection error:', error);
  });

module.exports = cloudinary; 
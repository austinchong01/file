// test-cloudinary.js - Run this file to test your Cloudinary configuration
require('dotenv').config();
const cloudinary = require('./config/cloudinary');
const fs = require('fs');
const path = require('path');

async function testCloudinaryConnection() {
  console.log('Testing Cloudinary configuration...\n');
  
  // Check if environment variables are set
  console.log('Environment variables:');
  console.log('CLOUDINARY_CLOUD_NAME:', process.env.CLOUDINARY_CLOUD_NAME ? '✓ Set' : '✗ Missing');
  console.log('CLOUDINARY_API_KEY:', process.env.CLOUDINARY_API_KEY ? '✓ Set' : '✗ Missing');
  console.log('CLOUDINARY_API_SECRET:', process.env.CLOUDINARY_API_SECRET ? '✓ Set' : '✗ Missing');
  console.log('');

  // Check Cloudinary configuration
  console.log('Cloudinary config:');
  console.log('Cloud name:', cloudinary.config().cloud_name || '✗ Not configured');
  console.log('API key:', cloudinary.config().api_key || '✗ Not configured');
  console.log('API secret:', cloudinary.config().api_secret ? '✓ Set' : '✗ Not configured');
  console.log('');

  try {
    // Test the connection by fetching API info
    console.log('Testing API connection...');
    const result = await cloudinary.api.ping();
    console.log('✓ Cloudinary connection successful!');
    console.log('Response:', result);
  } catch (error) {
    console.log('✗ Cloudinary connection failed!');
    console.error('Error:', error.message);
    
    if (error.message.includes('Invalid API Key')) {
      console.log('\nTroubleshooting:');
      console.log('1. Check your CLOUDINARY_API_KEY in .env');
      console.log('2. Make sure there are no extra spaces or quotes');
      console.log('3. Verify the key from your Cloudinary dashboard');
    } else if (error.message.includes('Invalid API Secret')) {
      console.log('\nTroubleshooting:');
      console.log('1. Check your CLOUDINARY_API_SECRET in .env');
      console.log('2. Make sure there are no extra spaces or quotes');
      console.log('3. Verify the secret from your Cloudinary dashboard');
    } else if (error.message.includes('cloud_name')) {
      console.log('\nTroubleshooting:');
      console.log('1. Check your CLOUDINARY_CLOUD_NAME in .env');
      console.log('2. Make sure it matches your Cloudinary account exactly');
    }
    return;
  }

  // Test actual file upload
  console.log('\n--- Testing File Upload ---');
  
  try {
    // Create a simple test file if it doesn't exist
    const testFilePath = path.join(__dirname, 'test-file.txt');
    if (!fs.existsSync(testFilePath)) {
      fs.writeFileSync(testFilePath, 'This is a test file for Cloudinary upload.');
      console.log('Created test file:', testFilePath);
    }

    console.log('Uploading test file to Cloudinary...');
    const uploadResult = await cloudinary.uploader.upload(testFilePath, {
      folder: 'file-uploader-test',
      public_id: `test_${Date.now()}`,
      resource_type: 'auto'
    });

    console.log('✓ File upload successful!');
    console.log('Upload result:');
    console.log('- public_id:', uploadResult.public_id);
    console.log('- secure_url:', uploadResult.secure_url);
    console.log('- resource_type:', uploadResult.resource_type);
    console.log('- format:', uploadResult.format);
    console.log('- bytes:', uploadResult.bytes);

    // Clean up test file
    console.log('\nCleaning up test file...');
    await cloudinary.uploader.destroy(uploadResult.public_id);
    fs.unlinkSync(testFilePath);
    console.log('✓ Test file cleaned up');

  } catch (uploadError) {
    console.log('✗ File upload failed!');
    console.error('Upload error:', uploadError.message);
    console.log('\nThis indicates that while your API connection works,');
    console.log('there might be an issue with the upload process or permissions.');
  }
}

// Run the test
testCloudinaryConnection().catch(console.error);
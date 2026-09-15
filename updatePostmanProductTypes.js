const fs = require('fs');
const mongoose = require('mongoose');
require('dotenv').config({ path: 'd:/anevix-ecom/.env' });

async function updatePostmanProductTypes() {
  try {
    const file = 'd:/anevix-ecom/docs/postman/Anevix.postman_collection.json';
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));

    const productsFolder = data.item.find(i => i.name === 'Products');
    if (!productsFolder) return console.log('Products folder not found');

    // Add External Product request
    const externalReqName = 'Create External Product';
    if (!productsFolder.item.find(i => i.name === externalReqName)) {
      productsFolder.item.push({
        name: externalReqName,
        request: {
          method: 'POST',
          header: [{ key: 'Authorization', value: 'Bearer {{ADMIN_TOKEN}}', type: 'text' }],
          body: {
            mode: 'raw',
            raw: '{\n  "name": "External Item",\n  "slug": "external-item",\n  "description": "Desc",\n  "shortDescription": "Short",\n  "sellerId": "{{SELLER_ID}}",\n  "categoryId": "{{CATEGORY_ID}}",\n  "sku": "EXT-001",\n  "price": 50,\n  "productType": "external",\n  "externalUrl": "https://example.com/buy",\n  "buttonText": "Buy from Partner"\n}',
            options: { raw: { language: 'json' } }
          },
          url: {
            raw: 'http://localhost:5000/api/products',
            protocol: 'http', host: ['localhost'], port: '5000',
            path: ['api', 'products']
          }
        }
      });
    }

    // Update Simple Product request (ensure no attributes)
    const simpleReq = productsFolder.item.find(i => i.name === 'Create Product (Simple)');
    if (simpleReq) {
      simpleReq.request.body.raw = '{\n  "name": "Simple Item",\n  "slug": "simple-item",\n  "description": "Desc",\n  "shortDescription": "Short",\n  "sellerId": "{{SELLER_ID}}",\n  "categoryId": "{{CATEGORY_ID}}",\n  "sku": "SIM-001",\n  "price": 100,\n  "productType": "simple"\n}';
    }

    // Add Variable Product Request
    const variableReqName = 'Create Variable Product';
    if (!productsFolder.item.find(i => i.name === variableReqName)) {
      productsFolder.item.push({
        name: variableReqName,
        request: {
          method: 'POST',
          header: [{ key: 'Authorization', value: 'Bearer {{ADMIN_TOKEN}}', type: 'text' }],
          body: {
            mode: 'raw',
            raw: '{\n  "name": "Variable Item",\n  "slug": "variable-item",\n  "description": "Desc",\n  "shortDescription": "Short",\n  "sellerId": "{{SELLER_ID}}",\n  "categoryId": "{{CATEGORY_ID}}",\n  "sku": "VAR-001",\n  "price": 200,\n  "productType": "variable",\n  "attributes": [\n    {\n      "name": "Size",\n      "options": ["S", "M", "L"]\n    }\n  ]\n}',
            options: { raw: { language: 'json' } }
          },
          url: {
            raw: 'http://localhost:5000/api/products',
            protocol: 'http', host: ['localhost'], port: '5000',
            path: ['api', 'products']
          }
        }
      });
    }

    fs.writeFileSync(file, JSON.stringify(data, null, 2));

    await mongoose.connect(process.env.MONGO_URL);
    const B2CSellerProfile = require('./src/models/B2CSellerProfile');
    const Category = require('./src/models/Category');
    const seller = await B2CSellerProfile.findOne();
    const category = await Category.findOne();

    let dataStr = fs.readFileSync(file, 'utf8');
    if (seller) dataStr = dataStr.replace(/{{SELLER_ID}}/g, seller._id.toString());
    if (category) dataStr = dataStr.replace(/{{CATEGORY_ID}}/g, category._id.toString());
    
    fs.writeFileSync(file, dataStr);

    console.log("Postman collection updated with strict product type requests!");
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

updatePostmanProductTypes();

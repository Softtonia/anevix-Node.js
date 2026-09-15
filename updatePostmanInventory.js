const fs = require('fs');
const mongoose = require('mongoose');
require('dotenv').config({ path: 'd:/anevix-ecom/.env' });

async function updatePostmanInventory() {
  try {
    const file = 'd:/anevix-ecom/docs/postman/Anevix.postman_collection.json';
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));

    const productsFolder = data.item.find(i => i.name === 'Products');
    if (!productsFolder) return console.log('Products folder not found');

    let inventoryFolder = productsFolder.item.find(i => i.name === 'Inventory');
    if (!inventoryFolder) {
      inventoryFolder = {
        name: 'Inventory',
        item: []
      };
      productsFolder.item.push(inventoryFolder);
    }

    inventoryFolder.item = [
      {
        name: 'Create Product Inventory',
        request: {
          method: 'POST',
          header: [{ key: 'Authorization', value: 'Bearer {{ADMIN_TOKEN}}', type: 'text' }],
          body: {
            mode: 'raw',
            raw: '{\n  "quantity": 100,\n  "reservedQuantity": 5,\n  "manageStock": true,\n  "lowStockThreshold": 10\n}',
            options: { raw: { language: 'json' } }
          },
          url: {
            raw: 'http://localhost:5000/api/products/{{PRODUCT_ID}}/inventory',
            protocol: 'http', host: ['localhost'], port: '5000',
            path: ['api', 'products', '{{PRODUCT_ID}}', 'inventory']
          }
        }
      },
      {
        name: 'Get Product Inventory',
        request: {
          method: 'GET',
          header: [{ key: 'Authorization', value: 'Bearer {{ADMIN_TOKEN}}', type: 'text' }],
          url: {
            raw: 'http://localhost:5000/api/products/{{PRODUCT_ID}}/inventory',
            protocol: 'http', host: ['localhost'], port: '5000',
            path: ['api', 'products', '{{PRODUCT_ID}}', 'inventory']
          }
        }
      },
      {
        name: 'Create Variant Inventory',
        request: {
          method: 'POST',
          header: [{ key: 'Authorization', value: 'Bearer {{ADMIN_TOKEN}}', type: 'text' }],
          body: {
            mode: 'raw',
            raw: '{\n  "quantity": 50,\n  "reservedQuantity": 0,\n  "manageStock": true\n}',
            options: { raw: { language: 'json' } }
          },
          url: {
            raw: 'http://localhost:5000/api/products/{{PRODUCT_ID}}/variants/{{VARIANT_ID}}/inventory',
            protocol: 'http', host: ['localhost'], port: '5000',
            path: ['api', 'products', '{{PRODUCT_ID}}', 'variants', '{{VARIANT_ID}}', 'inventory']
          }
        }
      },
      {
        name: 'Get Inventory By ID',
        request: {
          method: 'GET',
          header: [{ key: 'Authorization', value: 'Bearer {{ADMIN_TOKEN}}', type: 'text' }],
          url: {
            raw: 'http://localhost:5000/api/inventory/{{INVENTORY_ID}}',
            protocol: 'http', host: ['localhost'], port: '5000',
            path: ['api', 'inventory', '{{INVENTORY_ID}}']
          }
        }
      },
      {
        name: 'Update Inventory',
        request: {
          method: 'PUT',
          header: [{ key: 'Authorization', value: 'Bearer {{ADMIN_TOKEN}}', type: 'text' }],
          body: {
            mode: 'raw',
            raw: '{\n  "quantity": 120\n}',
            options: { raw: { language: 'json' } }
          },
          url: {
            raw: 'http://localhost:5000/api/inventory/{{INVENTORY_ID}}',
            protocol: 'http', host: ['localhost'], port: '5000',
            path: ['api', 'inventory', '{{INVENTORY_ID}}']
          }
        }
      },
      {
        name: 'Adjust Inventory',
        request: {
          method: 'PATCH',
          header: [{ key: 'Authorization', value: 'Bearer {{ADMIN_TOKEN}}', type: 'text' }],
          body: {
            mode: 'raw',
            raw: '{\n  "adjustment": -3\n}',
            options: { raw: { language: 'json' } }
          },
          url: {
            raw: 'http://localhost:5000/api/inventory/{{INVENTORY_ID}}/adjust',
            protocol: 'http', host: ['localhost'], port: '5000',
            path: ['api', 'inventory', '{{INVENTORY_ID}}', 'adjust']
          }
        }
      },
      {
        name: 'Delete Inventory',
        request: {
          method: 'DELETE',
          header: [{ key: 'Authorization', value: 'Bearer {{ADMIN_TOKEN}}', type: 'text' }],
          url: {
            raw: 'http://localhost:5000/api/inventory/{{INVENTORY_ID}}',
            protocol: 'http', host: ['localhost'], port: '5000',
            path: ['api', 'inventory', '{{INVENTORY_ID}}']
          }
        }
      }
    ];

    fs.writeFileSync(file, JSON.stringify(data, null, 2));

    // Connect to DB and replace variables with real IDs (if possible)
    await mongoose.connect(process.env.MONGO_URL);
    const Product = require('./src/models/Product');
    const ProductVariant = require('./src/models/ProductVariant');
    const Inventory = require('./src/models/Inventory');

    let simpleP = await Product.findOne({ productType: 'simple' });
    let varP = await Product.findOne({ productType: 'variable' });
    let variant = varP ? await ProductVariant.findOne({ productId: varP._id }) : null;
    let inv = await Inventory.findOne();

    let dataStr = fs.readFileSync(file, 'utf8');
    if (simpleP) dataStr = dataStr.replace(/{{PRODUCT_ID}}/g, simpleP._id.toString());
    if (variant) dataStr = dataStr.replace(/{{VARIANT_ID}}/g, variant._id.toString());
    if (inv) dataStr = dataStr.replace(/{{INVENTORY_ID}}/g, inv._id.toString());
    fs.writeFileSync(file, dataStr);

    console.log("Postman collection updated with Inventory folder and real IDs!");
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

updatePostmanInventory();

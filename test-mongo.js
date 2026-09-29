const mongoose = require('mongoose');
mongoose.connect('mongodb://127.0.0.1:27017/test').then(async () => {
    const Product = require('./src/models/product/Product');
    const docs = await Product.find({ batchId: { $exists: true } }).select('batchId sku name').lean();
    console.log(JSON.stringify(docs, null, 2));
    process.exit(0);
}).catch(console.error);

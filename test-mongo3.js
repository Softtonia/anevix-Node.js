const mongoose = require('mongoose');
mongoose.connect('mongodb+srv://anevix_ecom:Anevix12345@cluster0.u1tced1.mongodb.net/?appName=Cluster0').then(async () => {
    const Product = require('./src/models/product/Product');
    const docs = await Product.find({ batchId: { $regex: /^BULK-/ } }).select('batchId sku name sellerId').lean().limit(1);
    console.log(JSON.stringify(docs, null, 2));
    process.exit(0);
}).catch(console.error);

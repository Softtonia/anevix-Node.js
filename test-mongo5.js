const mongoose = require('mongoose');
mongoose.connect('mongodb+srv://anevix_ecom:Anevix12345@cluster0.u1tced1.mongodb.net/?appName=Cluster0').then(async () => {
    const Product = require('./src/models/product/Product');
    const docs = await Product.find({ batchId: { $regex: /^BULK-/ }, sellerId: '6ab20b2aa549a153e282894c' }).select('batchId sku name sellerId').lean();
    console.log("For 6ab20b2aa549a153e282894c:", docs.length);
    process.exit(0);
}).catch(console.error);

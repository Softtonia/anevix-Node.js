const mongoose = require('mongoose');
mongoose.connect('mongodb+srv://anevix_ecom:Anevix12345@cluster0.u1tced1.mongodb.net/?appName=Cluster0').then(async () => {
    const Product = require('./src/models/product/Product');
    const result = await Product.updateMany({ batchId: { $regex: /^BULK-/ } }, { $set: { sellerId: '6ab20b2aa549a153e282894c' } });
    console.log("Updated", result.modifiedCount);
    process.exit(0);
}).catch(console.error);

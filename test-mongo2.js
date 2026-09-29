const mongoose = require('mongoose');
mongoose.connect('mongodb+srv://anevix_ecom:Anevix12345@cluster0.u1tced1.mongodb.net/?appName=Cluster0').then(async () => {
    const Product = require('./src/models/product/Product');
    const docs = await Product.find({ batchId: { $regex: /^BULK-/ } }).select('batchId sku name').lean().limit(5);
    console.log("Bulk docs:", docs.length);
    const aggr = await Product.aggregate([
      { $match: { batchId: { $regex: /^BULK-/ } } },
      { $limit: 2 }
    ]);
    console.log("Aggr bulk:", aggr.length);
    process.exit(0);
}).catch(console.error);

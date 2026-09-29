const mongoose = require('mongoose');
mongoose.connect('mongodb+srv://anevix_ecom:Anevix12345@cluster0.u1tced1.mongodb.net/?appName=Cluster0').then(async () => {
    const Product = require('./src/models/product/Product');
    const doc = await Product.findById("6ab64e5e5ed628383394b73c").select('sellerId');
    console.log("Single upload sellerId:", doc ? doc.sellerId : "Not found");
    process.exit(0);
}).catch(console.error);

const mongoose = require('mongoose');

const MONGODB_URL = 'mongodb://localhost:27017/chatapp';

const connectDB = async () => {

    try {

        await mongoose.connect(MONGODB_URL, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });

        console.log('MONGODB bağlantısı başarılı');

    } catch (error) {

        console.error('MONGODB bağlantı hatası: ', error.message);
        process.exit(1);

    };

}

module.exports = connectDB;
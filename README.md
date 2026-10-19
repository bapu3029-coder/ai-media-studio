# AI मीडिया स्टूडियो

तीन काम एक ऐप में:

1. **टेक्स्ट से इमेज**: प्रॉम्प्ट लिखें, इमेज पाएँ।
2. **इमेज से वीडियो**: फ़ोटो चुनें, AI उसे वीडियो बना दे।
3. **फ़ोटो + प्रॉम्प्ट से वीडियो**: फ़ोटो चुनें, लिखें कि क्या हलचल हो, वीडियो पाएँ।

यह [Replicate](https://replicate.com) की API इस्तेमाल करता है। इमेज बनाने के लिए `black-forest-labs/flux-schnell` और वीडियो के लिए `bytedance/seedance-1-lite` पहले से चुने हुए हैं।

## ज़रूरी बात: GitHub Pages पर यह नहीं चलेगा

GitHub Pages सिर्फ़ स्टैटिक पेज चलाता है। इस ऐप को एक छोटा सर्वर चाहिए, ताकि आपका API token छिपा रहे। इसलिए कोड GitHub में रखें, और चलाने के लिए Render, Railway या Codespaces जैसी जगह इस्तेमाल करें।

## अपने कंप्यूटर पर चलाना

1. Node.js 20.6 या उससे नया इंस्टॉल करें।
2. https://replicate.com/account/api-tokens से token लें (बिलिंग चालू करनी होगी)।
3. `.env.example` को कॉपी करके `.env` नाम दें और उसमें token डालें।
4. `npm run dev` चलाएँ और http://localhost:3000 खोलें।

## GitHub पर डालना

1. GitHub पर नई repository बनाएँ।
2. **Add file → Upload files** से सारी फ़ाइलें डालें (`public` फ़ोल्डर समेत)।
3. `.env` फ़ाइल कभी अपलोड न करें। उसमें आपका token है।

## Render पर चलाना (मुफ़्त शुरुआत)

1. render.com पर **New → Web Service** चुनें और अपनी repository जोड़ें।
2. Build Command खाली छोड़ें। Start Command: `npm start`
3. **Environment** में `REPLICATE_API_TOKEN` और `APP_PASSWORD` डालें।
4. Deploy करें। `APP_PASSWORD` ज़रूर रखें, वरना कोई भी आपके पैसे से वीडियो बना सकता है।

## मॉडल बदलना

मॉडल का नाम और उसके input के नाम समय के साथ बदलते रहते हैं। कुछ न चले तो replicate.com पर उस मॉडल का **API** टैब देखें और `.env` में `VIDEO_MODEL`, `VIDEO_IMAGE_FIELD`, `VIDEO_EXTRA_INPUT` ठीक करें।

// netlify/functions/stalk.js
const fetch = require('node-fetch');

exports.handler = async function(event, context) {
  // handle cors langsung di awal
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
      },
      body: ''
    };
  }

  const { stalk, username, sessionid } = event.queryStringParameters;
  
  if (!stalk || !username) {
    return {
      statusCode: 400,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        error: true,
        message: 'parameter kurang. contoh: ?stalk=instagram&username=nama_user'
      })
    };
  }

  try {
    let result;
    
    if (stalk.toLowerCase() === 'instagram') {
      result = await stalkInstagram(username, sessionid);
    } else if (stalk.toLowerCase() === 'tiktok') {
      result = await stalkTikTok(username);
    } else {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          error: true,
          message: 'jenis stalk gak dikenal. pilih instagram atau tiktok'
        })
      };
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        error: false,
        platform: stalk,
        username: username,
        data: result,
        timestamp: new Date().toISOString()
      })
    };

  } catch (error) {
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        error: true,
        message: error.message,
        platform: stalk,
        username: username
      })
    };
  }
};

async function stalkInstagram(username, sessionid) {
  const url = `https://i.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(username)}`;
  
  const headers = {
    'User-Agent': 'Instagram 328.1.3.32.89 Android (24/7.0; 640dpi; 1440x2560; samsung; SM-G930F; herolte; samsungexynos8890; en_US; 382186584)',
    'Accept-Language': 'en-US',
    'Accept-Encoding': 'gzip, deflate',
    'Connection': 'close'
  };

  if (sessionid) {
    headers.Cookie = `sessionid=${sessionid}`;
  }

  const response = await fetch(url, { headers });
  
  if (!response.ok) {
    throw new Error(`instagram api error: ${response.status}`);
  }

  const data = await response.json();
  
  if (!data.data?.user) {
    throw new Error('data user gak ketemu');
  }

  return data.data.user;
}

async function stalkTikTok(username) {
  const cleanUsername = username.replace('@', '');
  const url = `https://www.tiktok.com/@${encodeURIComponent(cleanUsername)}`;
  
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive'
  };

  const response = await fetch(url, { headers });
  
  if (!response.ok) {
    throw new Error(`tiktok error: ${response.status}`);
  }

  const html = await response.text();
  
  const scriptRegex = /<script[^>]*id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>([\s\S]*?)<\/script>/i;
  const match = html.match(scriptRegex);
  
  if (!match || !match[1]) {
    throw new Error('data tiktok gak ketemu di halaman');
  }

  try {
    const jsonData = JSON.parse(match[1]);
    const userDetail = jsonData?.__DEFAULT_SCOPE__?.['webapp.user-detail'];
    
    if (!userDetail) {
      throw new Error('data user detail gak ada');
    }

    return userDetail;
  } catch (parseError) {
    throw new Error(`gagal parse data tiktok: ${parseError.message}`);
  }
      }

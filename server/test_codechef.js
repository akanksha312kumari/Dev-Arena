const axios = require('axios');
const cheerio = require('cheerio');

axios.get('https://www.codechef.com/users/gennady.korotkevich')
  .then(res => {
    const $ = cheerio.load(res.data);
    
    const ratingStr = $('.rating-number').text().trim().split(/\s+/)[0];
    const rating = parseInt(ratingStr) || 0;

    const solvedStr = $('h3:contains("Total Problems Solved")').text();
    const total = parseInt(solvedStr.replace(/[^0-9]/g, '')) || 0;
    
    const contestsStr = $('.contest-participated-count b').text();
    const contests = parseInt(contestsStr) || 0;

    console.log('Rating:', rating);
    console.log('Solved:', total);
    console.log('Contests:', contests);

  })
  .catch(console.error);

const axios = require('axios');

const baseUrl = "https://nhl-score-api.herokuapp.com/api";

const getResults = () => {
    return axios.get(`${baseUrl}/scores/latest`);
}

const getUpcomingGames = (endDate, startDate = endDate) => {
    return axios.get(`${baseUrl}/scores?startDate=${startDate}&endDate=${endDate}`);
}

// eslint-disable-next-line import/no-anonymous-default-export
module.exports = {
    getResults,
    getUpcomingGames
}
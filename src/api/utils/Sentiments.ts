var Sentiment = require('sentiment');
const natural = require('natural');
const stopwords = require('natural').stopwords;

export const getSentiment = (str: String) => {
  var sentiment = new Sentiment();
  var result = sentiment.analyze(str);
  return result;
};

export const extractKeywords = (sentence: String) => {
  const tokenizer = new natural.WordTokenizer();
  const words = tokenizer.tokenize(sentence);

  const filteredWords = words.filter((word: string) => !stopwords.includes(word.toLowerCase()));

  const stemmer = natural.PorterStemmer;
  const stemmedWords = filteredWords.map((word: any) => stemmer.stem(word));

  return stemmedWords;
};

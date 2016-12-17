'use strict';

/**
 * Module dependencies.
 */

const mongoose = require('mongoose');
const { wrap: async } = require('co');
const { respond } = require('../utils');
const Article = mongoose.model('Article');

const blackListWords = ['i', 'is', 'my', 'we', 'this', 'the', 'a', 'are', 'in', 'to', 'it',
	'an', 'and', 'of', 'as', 'at', 'that', 'for', 'on',
	'has', 'have', 'be', 'or', 'then', 'you', 'me', 'your',
	'there', 'their', 'than', 'from', 'who', 'may', 'what',
	'but', 'can', 'such', 'with', 'all', 'by', 'which', 'some',
	'also', 'most', 'more', 'it’s', 'they', 'when', 'eg'];

exports.index = async(function* (req, res) {
  /** steps:
	 * 
   1. count words freq for all articles
   2. move on each article
       2.1. move on current article tags 
       2.2. find article in freqPerArticle
       2.3. sum for each word the freq from all articles in dic
       2.4. move on dic and take biggest 10*/

	const articles = yield Article.list({});
	var analytics = {};

	var freqPerTag = CalcFreqInTags(articles);

	for (var tag in freqPerTag) {
		analytics[tag] = CalcFinalAnalytics(freqPerTag[tag]);
	}

  respond(res, 'analytics/index', {
    title: 'Analytics',
    freqByTag: analytics
  });
});

function CalcFreqInTags(articles) {
	var freqPerArticle = {};
	var freqPerTag = {};

  // move on all articles
	for (var i = 0; i < articles.length; i++) {
		var currArticle = articles[i];
		// if theres no tags we wont count freq
		if (currArticle.tags != "") {
			freqPerArticle[currArticle._id] = {};
			// count body words freq
			freqPerArticle[currArticle._id] = countWordsFreqInArticle(currArticle);
      CountFreqForTagsInArticle(currArticle, freqPerArticle[currArticle._id], freqPerTag);
		}
	}
		return freqPerTag;
}

function CountFreqForTagsInArticle(article, freqCurrArticle, freqPerTag) {
	var tags = article.tags.split(',');
	for (var i = 0; i < tags.length; i++) {
		var currTag = tags[i];
		if (freqPerTag[currTag]) {
			// move on freqPerArticle words
			for (var word in freqCurrArticle) {
				if (freqPerTag[currTag][word]) {
					freqPerTag[currTag][word] += freqCurrArticle[word];
				}
				else {
					freqPerTag[currTag][word] = freqCurrArticle[word];
				}
			}
		}
		else {
			// its need to be by val and not by ref.
			freqPerTag[currTag] = JSON.parse(JSON.stringify(freqCurrArticle));
		}
	}
}

function countWordsFreqInArticle(article) {
  var body = RemovePunctuation(article.body);
	var words = body.split(' ');
	var freqInArticle = {};
	
	for (var i = 0; i < words.length; i++) {
		var currWord = words[i].toLowerCase();
		// check that its not word from the blacklist
		if (blackListWords.indexOf(currWord) == -1) {
			if (freqInArticle[currWord]) {
				freqInArticle[currWord]++;
			}
			else {
				freqInArticle[currWord] = 1;
			}
		}
	}
	return freqInArticle;
}

function RemovePunctuation(str) {
	var punctuationless = str.replace(/[.,?\/#!$%\^&\*;:{}=\-—_`~()]/g, "");
	return punctuationless.replace(/\s{2,}/g, " ");
}

// select only the top 10 words that appear most per tag
function CalcFinalAnalytics(freqForTag) {
	// change the freq object structure to array of objects 
	var props = Object.keys(freqForTag).map(function (key) {
		return { key: key, value: this[key] };
	}, freqForTag);

	// sort the array by value
	props.sort(function (p1, p2) { return p2.value - p1.value; });

	// taks the first 10 occurences and return the structure to original object stracture
	var topTenObj = props.slice(0, 10).reduce(function (obj, prop) {
		obj[prop.key] = prop.value;
		return obj;
	}, {});

	return topTenObj;
}
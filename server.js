var async = require('async')
  , fs = require('fs')
  , request = require('request')
  , cheerio = require('cheerio');

var MIN_PEAK_ID = 1;
var MAX_PEAK_ID = 60000;
var WAIT_TIME_MS = 3000;

var parsePeak = function(peakId, callback) {
	var peakHtmlUrl = 'http://peakbagger.com/peak.aspx?pid=' + peakId;

	request(peakHtmlUrl, function(err, response, html) {
		if (err) {
			console.log(err);
			return callback('html fetch failed');
		}

		var $ = cheerio.load(html);
        var anchors = $('a');

		console.log(peakId);

		if ($('h1').text() === 'Invalid Peak ID')
			return callback(null, { id: peakId, exists: false });

		var elevationRaw = $('h2').text();

		var elevationParsed = parseFloat(/\d+\+* meters/.exec(elevationRaw)[0]);

        var latitude;
        var longitude;

        for (var key in anchors) {
        	if (anchors[key].attribs && anchors[key].attribs.href) {
	        	var locationUrl = anchors[key].attribs.href;
	        	if (locationUrl && locationUrl.indexOf('maps.bing.com') !== -1) {
	        		console.log(locationUrl);
	        		var hrefSplit = locationUrl.split('=');
	        		var locationSplit = hrefSplit[2].split('~');

	        		latitude = parseFloat(locationSplit[0]);
					longitude = parseFloat(locationSplit[1]);
	        	}
        	}
        }

		var peak = {
			id: peakId,
			exists: true,
			name: $('h1').text(),

			elevationRaw: $('h2').text(),
			elevation: elevationParsed,

			locationUrl: locationUrl,
			latitude: latitude,
			longitude: longitude
		}

		return callback(null, peak);
	});
};

async.forever(
	function(next) {
		setTimeout(function() {
			var peakId;

			do {
				peakId = Math.floor(Math.random() * (MAX_PEAK_ID - MIN_PEAK_ID) + MIN_PEAK_ID);
			} while (fs.existsSync('peaks/' + peakId));

			parsePeak(peakId, function(err, peak) {
				if (err) return console.log('error: ' + err);

				fs.writeFile('peaks/' + peakId, JSON.stringify(peak), function(err) {
					next();
				});

				if (peak.exists)
					console.log(peak.id + ": " + peak.name + ": " + peak.latitude + ": " + peak.longitude + ": " + peak.elevation);
				else
					console.log(peak.id + ": nonexistant");
			});
		}, WAIT_TIME_MS * Math.random());
	},
	function(err) { }
);

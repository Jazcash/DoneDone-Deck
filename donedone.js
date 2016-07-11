var request = require('request');
var syncrequest = require('sync-request');

var Donedone = function(subdomain, username, apikey){
	this.url = `https://${username}:${apikey}@${subdomain}.mydonedone.com/issuetracker/api/v2`;
}

/* Companies and people */

Donedone.prototype.getCompanies = function(callback){
	request(this.url + "/companies.json", function (error, response, body) {
		if (!error && response.statusCode == 200) {
			callback(JSON.parse(body));
		} else {
			console.log("ERROR IN GET COMPANIES");
		}
	});
};

Donedone.prototype.getCompany = function(companyId, callback){
	request(this.url + `/companies/${companyId}.json`, function (error, response, body) {
		if (!error && response.statusCode == 200) {
			callback(JSON.parse(body));
		} else {
			console.log("ERROR IN GET COMPANY");
		}
	});
};

Donedone.prototype.getPerson = function(personId, callback){
	request(this.url + `/people/${personId}.json`, function (error, response, body) {
		if (!error && response.statusCode == 200) {
			callback(JSON.parse(body));
		} else {
			console.log("ERROR IN GET PERSON");
		}
	});
};

/* Projects */

Donedone.prototype.getProjects = function(callback){
	request(this.url + `/projects.json`, function (error, response, body) {
		if (!error && response.statusCode == 200) {
			callback(JSON.parse(body));
		} else {
			console.log("ERROR IN GET PROJECTS");
		}
	});
};

Donedone.prototype.getProject = function(projectId, callback){
	request(this.url + `/project/${projectId}.json`, function (error, response, body) {
		if (!error && response.statusCode == 200) {
			callback(JSON.parse(body));
		} else {
			console.log("ERROR IN GET PROJECT");
		}
	});
};

/* Issues */

Donedone.prototype.getIssue = function(projectId, issueId, callback){
	request(this.url + `/projects/${projectId}/issues/${issueId}.json`, function (error, response, body) {
		if (!error && response.statusCode == 200) {
			callback(JSON.parse(body));
		} else {
			console.log("ERROR IN GET ISSUE");
		}
	});
};

/* Issue Lists */

// promisify the request() function so it returns a promise
// whose fulfilled value is the request result
function requestP(url) {
    return new Promise(function(resolve, reject) {
        request(url, function(err, response, body) {
            if (err || response.statusCode !== 200) {
                reject({err: err, response: response});
            } else {
                resolve({response: response, body: body});
            }
        });
    });
}

Donedone.prototype.getAllActiveIssues = function() {
    var url = this.url;
    return requestP(url + `/issues/all_active.json?take=500`).then(function(results) {
        var data = JSON.parse(results.body);
        var promises = [];
        for (let i = 0; i < data.total_issues; i+= 500) {
            promises.push(requestP(url + `/issues/all_active.json?skip=${i}&take=500`).then(function(results) {
            	console.log("polling donedone api");
                return JSON.parse(results.body).issues;
            }));
        }
        return Promise.all(promises).then(function(results) {
            // results is an array of each chunk (which is itself an array) so we have an array of arrays
            // now concat all results in order
            return Array.prototype.concat.apply([], results);
        })
    });
}

Donedone.prototype.getAllActiveIssuesSync = function() {
    var url = this.url;
    var issues = [];
    console.log("polling donedone api");
    var res = syncrequest("GET", url + `/issues/all_active.json?take=500`);
    var data = JSON.parse(res.getBody('utf8'));
    issues = issues.concat(data.issues);
    if (data.total_issues > 500){
    	for (let i=500; i<data.total_issues; i+=500){
    		console.log("polling donedone api");
    		res = syncrequest("GET", url + `/issues/all_active.json?take=500&skip=${i}`);
    		let data = JSON.parse(res.getBody('utf8'));
    		issues = issues.concat(data.issues);
    	}
    }
    return issues;
}

exports.Donedone = Donedone;

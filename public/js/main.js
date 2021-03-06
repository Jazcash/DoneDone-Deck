let limit = -1; // -1 = no limit
let currentFilter = "status";
var issuePriorities = {};
let subdomain = "";
let sortableCategoriesEl;
let statuses, people, issues, sortableIssuesEls = [];

let divFilter = document.getElementById("filter");
let btnLoginModal = document.getElementById("btnLoginModal");
let divLoginModal = document.getElementById("loginModal");
let txtFieldUsername = document.getElementById("username");
let btnLogin = document.getElementById("btnLogin");
let btnCancel = document.getElementById("btnCancel");

if (btnLogin){
	btnLogin.addEventListener("click", login);
} else {
	getIssues();
}

function login(){
	let username = document.getElementById("username").value;
	let password = document.getElementById("password").value;

	if (username === "" || password === "")
		return;

	$.post("/login", {username: username, password: password}, function(usertype){
		if (usertype === "ADMIN" || usertype === "NORMAL"){
			// initiate loading animation here
			window.location = "/";
		} else {
			alert("Invalid login");
		}
	});
}

function getIssues(){
	$.post("/issues", function(data){
		subdomain = data.subdomain;
		issues = data.issues;
		if (data.issuePriorities !== undefined)
			issuePriorities = data.issuePriorities;
		statuses = data.statuses;
		people = data.people.map(p => p = {id: p.id, name: `${p.first_name} ${p.last_name}`});
		projects = data.projects.map(p => p = {id: p.id, name: p.title});

		renderIssues("status", statuses, "project", "fixer");

		let filterButtons = Array.from(divFilter.children);
		filterButtons.forEach(function(el){
			el.addEventListener("click", function(evt){
				let thisFilter = evt.currentTarget.getAttribute("data-filter");
				if (thisFilter != currentFilter){
					filterButtons.forEach(function(el){
						el.className = "";
					});
					evt.currentTarget.className = "active";
					currentFilter = thisFilter;
					rerenderIssues();
				}
			});
		});
	});
}

// categoryKey can be: "status", "fixer" or project"
function renderIssues(categoryKey, categories, headerKey, footerKey){
	// if sortable instances already exist, destroy them
	if (sortableCategoriesEl != undefined){
		sortableCategoriesEl.destroy();
		sortableIssuesEls.forEach(function(el){ el.destroy(); })
		sortableIssuesEls = [];
	}

	// if issues have already been rendered, remove them
	let oldCatEl = document.getElementById("categories")
	if (oldCatEl){
		oldCatEl.parentNode.removeChild(oldCatEl);
	}

	// iterate through all the categories and create column elements for each
	let categoryElements = {};
	for (let i=0; len=categories.length, i<len; i++){
		let category = categories[i];
		let categoryEl = document.createElement('div');
		categoryEl.className = "category";
		categoryEl.setAttribute("data-id", category.id);
		let categoryTitleEl = document.createElement('div');
		categoryTitleEl.className = "category-title";
		let categoryTitle = document.createTextNode(category.name);
		categoryTitleEl.appendChild(categoryTitle);
		categoryEl.appendChild(categoryTitleEl);
		let issuesEl = document.createElement("div");
		issuesEl.className = "issues"
		categoryEl.appendChild(issuesEl);
		categoryElements[category.id] = categoryEl;
	}

	// iterate through all the issues and append them to their respective categories
	for (let i=0; len=(limit === -1) ? issues.length : limit, i<len; i++){
		let issue = issues[i];
		let issueEl = document.createElement("div");
		issueEl.className = "issue " + issue.priority.name;
		issueEl.setAttribute("data-id", issue.project.id + "-" + issue.order_number);
		let issueHeaderEl = document.createElement("div");
		issueHeaderEl.className = "issue-header";
		let issueHeaderText = document.createTextNode(issue[headerKey].name);
		issueHeaderEl.appendChild(issueHeaderText);
		let issueTitleEl = document.createElement("div");
		issueTitleEl.className = "issue-title";
		let issueTitleText = document.createTextNode(issue.title);
		issueTitleEl.appendChild(issueTitleText);
		let issueFooterEl = document.createElement("div");
		issueFooterEl.className = "issue-footer";
		let issueFooterText = document.createTextNode(issue[footerKey].name);
		issueFooterEl.appendChild(issueFooterText);
		issueEl.appendChild(issueHeaderEl);
		issueEl.appendChild(issueTitleEl);
		issueEl.appendChild(issueFooterEl);
		categoryElements[issue[categoryKey].id].children[1].appendChild(issueEl);
	}

	// add all the categories to a parent node, then add that node to the DOM
	let container = document.createElement("div");
	container.className = "categories";
	container.id = "categories";
	for (let key in categoryElements){
		container.appendChild(categoryElements[key]);
	}
	document.body.insertBefore(container, document.getElementById("menu").nextSibling);

	// set the column title heights to all be the same
	let tallest = 0;
	$(".category-title").each(function(i, el){
		if ($(el).outerHeight() > tallest)
			tallest = $(el).outerHeight();
	});
	$(".category-title").css("min-height", tallest);

	// setup our sortable instances and store them in global lets for later reference
	sortableCategoriesEl = Sortable.create(document.getElementById("categories"),
	{
		group: {
			name: "categories",
			pull: true,
			put: true
		},
		animation: 150,
		onUpdate: function(evt){
			this.save();
		},
		store: {
			get: function (sortable) {
				//let order = sortable.toArray();
				//return order.reverse();
				let order = localStorage.getItem(sortable.options.group.name);
				return order ? order.split('|') : [];
			},
			set: function (sortable) {
				let order = sortable.toArray();
				localStorage.setItem(sortable.options.group.name, order.join('|'));
			}
		}
	});

	let groupNames = [];

	Array.from(document.getElementsByClassName("issues")).forEach(function(el){
		let thisGroupName = el.parentElement.getAttribute("data-id");
		groupNames.push(thisGroupName);

		sortableIssuesEls.push(
			Sortable.create(el,
			{
				group: {
					name: thisGroupName,
					pull: true,
					put: groupNames
				},
				animation: 150,
				onAdd: function(evt){
					let issueId = evt.item.getAttribute("data-id");
					let categoryId = this.option("group").name;
					switch(currentFilter){
						case "status":
							//socket.emit("updateIssueStatus", issueId, categoryId, function(response){
							//	console.log(response);
							//});
							break;
						case "fixer":
							//socket.emit("changeIssueFixer", issueId, categoryId, function(response){
							//	console.log(response);
							//});
							break;
						case "project":
							break;
						default:
							break;
					}
				},
				onSort: function(evt){
					issuePriorities[this.option("group").name] = this.toArray();
					//socket.emit("priorityUpdate", issuePriorities);
				},
				store: {
					get: function(sortable) {
						return issuePriorities[sortable.option("group").name] || [];
					},
					set: function(sortable){}
				}
			})
		);
	});

	// trigger action when issue is clicked and not dragged
	$(".issue").each(function(i, el){
		let counter = 0;
		let isDragging = false;
		$(el).mousedown(function() {
			isDragging = false;
			$(window).mousemove(function() {
				isDragging = true;
				$(window).unbind("mousemove");
			});
		}).mouseup(function() {
			let wasDragging = isDragging;
			isDragging = false;
			$(window).unbind("mousemove");
			if (!wasDragging) {
				let ids = $(el).attr("data-id").split("-");
				let url = `https://${subdomain}.mydonedone.com/issuetracker/projects/${ids[0]}/issues/${ids[1]}`;
				window.open(url, '_blank');
			}
		});
	});
}

function rerenderIssues(){
	switch(currentFilter){
		case "status":
			renderIssues(currentFilter, statuses, "project", "fixer");
			break;
		case "fixer":
			renderIssues(currentFilter, people, "project", "status");
			break;
		case "project":
			renderIssues(currentFilter, projects, "fixer", "status");
			break;
		default:
			break;
	}
}

// socket.on("init", function(_subdomain, _issues, _issuePriorities, _statuses, _people, _projects){
// 	subdomain = _subdomain;
// 	issues = _issues;
// 	issuePriorities = _issuePriorities;
// 	statuses = _statuses;
// 	people = _people.map(p => p = {id: p.id, name: `${p.first_name} ${p.last_name}`});
// 	projects = _projects.map(p => p = {id: p.id, name: p.title});

// 	renderIssues("status", statuses, "project", "fixer");

// 	let filterButtons = Array.from(divFilter.children);
// 	filterButtons.forEach(function(el){
// 		el.addEventListener("click", function(evt){
// 			let thisFilter = evt.currentTarget.getAttribute("data-filter");
// 			if (thisFilter != currentFilter){
// 				filterButtons.forEach(function(el){
// 					el.className = "";
// 				});
// 				evt.currentTarget.className = "active";
// 				currentFilter = thisFilter;
// 				rerenderIssues();
// 			}
// 		});
// 	});
// });

// socket.on("update", function(_issues, statuses, people, projects){
// 	issues = _issues;
// });

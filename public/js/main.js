let socket = io.connect('http://localhost:3000');
let issueCategories = document.getElementById("issue-categories");
let limit = -1; // -1 = no limit

socket.on('connect', function(data) {
	socket.emit('join', 'Hello World from client');
});

let currentFilter = "status";
let issues = [];
let subdomain = "";
let sortableCategoriesEl;
let sortableIssuesEls = [];

// categoryKey can be: "status", "fixer", "tester" or project"
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
		categoryEl.id = category.replace(/ /g,'');
		let categoryTitleEl = document.createElement('div');
		categoryTitleEl.className = "category-title";
		let categoryTitle = document.createTextNode(category);
		categoryTitleEl.appendChild(categoryTitle);
		categoryEl.appendChild(categoryTitleEl);
		let issuesEl = document.createElement("div");
		issuesEl.className = "issues"
		categoryEl.appendChild(issuesEl);
		categoryElements[category] = categoryEl;
	}

	// iterate through all the issues and append them to their respective categories
	for (let i=0; len=(limit === -1) ? issues.length : limit, i<len; i++){
		let issue = issues[i];
		let issueEl = document.createElement("div");
		issueEl.className = "issue " + issue.priority.name;
		issueEl.id = issue.project.id + "-" + issue.order_number;
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
		categoryElements[issue[categoryKey].name].children[1].appendChild(issueEl);
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
		if ($(el).height() > tallest)
			tallest = $(el).height();
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
				var order = localStorage.getItem(sortable.options.group.name);
				return order ? order.split('|') : [];
			},
			set: function (sortable) {
				var order = sortable.toArray();
				localStorage.setItem(sortable.options.group.name, order.join('|'));
			}
		}
	});

	Array.from(document.getElementsByClassName("issues")).forEach(function(el){
		sortableIssuesEls.push(
			Sortable.create(el,
			{
				group: {
					name: "issues",
					pull: true,
					put: true
				},
				animation: 150,
				onSort: function(evt){
					this.save();
				},
				store: {
					get: function (sortable) {
						var order = localStorage.getItem(sortable.options.group.name);
						return order ? order.split('|') : [];
					},
					set: function (sortable) {
						var order = sortable.toArray();
						localStorage.setItem(sortable.options.group.name, order.join('|'));
					}
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
				let ids = $(el).attr("id").split("-");
				let url = `https://${subdomain}.mydonedone.com/issuetracker/projects/${ids[0]}/issues/${ids[1]}`;
				window.open(url, '_blank');
			}
		});
	});
}

function rerenderIssues(statuses, fixers, testers, projects){
	switch(currentFilter){
		case "status":
		renderIssues(currentFilter, statuses.sort(), "project", "fixer");
		break;
		case "fixer":
		renderIssues(currentFilter, fixers.sort(), "project", "status");
		break;
		case "tester":
		renderIssues(currentFilter, testers.sort(), "project", "status");
		break;
		case "project":
		renderIssues(currentFilter, projects.sort(), "fixer", "status");
		break;
		default:
		break;
	}
}

socket.on("init", function(_subdomain, _issues, statuses, fixers, testers, projects){
	issues = _issues;
	subdomain = _subdomain;
	renderIssues("status", statuses.sort(), "project", "fixer");

	document.getElementById("filter").addEventListener("change", function(){
		currentFilter = this.value;
		rerenderIssues(statuses, fixers, testers, projects);
	});

	$("#refresh").on("click", function(){
		rerenderIssues(statuses, fixers, testers, projects);
	});
});

socket.on("update", function(_issues, statuses, fixers, testers, projects){
	issues = _issues;
});

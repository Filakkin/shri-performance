function quantile(arr, q) {
	const sorted = arr.sort((a, b) => a - b);
	const pos = (sorted.length - 1) * q;
	const base = Math.floor(pos);
	const rest = pos - base;

	if (sorted[base + 1] !== undefined) {
		return Math.floor(sorted[base] + rest * (sorted[base + 1] - sorted[base]));
	} else {
		return Math.floor(sorted[base]);
	}
};

function prepareData(result) {
	return result.data.map(item => {
		item.date = item.timestamp.split('T')[0];

		return item;
	});
}

// TODO: реализовать
// показать значение метрики за несколько день
function showMetricByPeriod(data, metric, start, end) {
	console.log(`Metric '${metric}' between ${start} and ${end}`)
	const loggedDates = data.getTypes('date').filter(item => item <= end && item >= start);
	let result = {};
	loggedDates.forEach(element => {
		let sliceData = data.getSlice('metric', metric)
			.filter(item => item.date === element)
			.map(item => item.value);
		result[element] = {
			hits: sliceData.length,
			p25: quantile(sliceData, 0.25),
			p50: quantile(sliceData, 0.50),
			p75: quantile(sliceData, 0.75),
			p95: quantile(sliceData, 0.95)
		}
	});

	console.table(result);
}

// показать сессию пользователя
function showSession(data, page, session) {
	console.log(`All metrics for ${session}:`);

	console.table(
		data
			.getSlice('session', session)
			.map(item => {
				return { page: item.page, name: item.name, value: item.value, timestamp: item.timestamp }
			}));
}

// сравнить метрику в разных срезах
function compareMetric(slices, name) {
	console.log(slices);
	let result = {};
	slices.forEach(slice => {
		let sliceData = slice.data
			.filter(metric => metric.name === name)
			.map(item => item.value);
		result[slice.name] = {
			hits: sliceData.length,
			p25: quantile(sliceData, 0.25),
			p50: quantile(sliceData, 0.50),
			p75: quantile(sliceData, 0.75),
			p95: quantile(sliceData, 0.95)
		}
	});

	console.table(result)
}

function showMetricByOs(data, page, name) {
	console.log(`'${name}' metric for page ${page} by OS:`);

	let osTypes = data.getTypes('os');
	let result = {};

	osTypes.forEach(element => {
		let sliceData = data.getSlice('os', element)
			.filter(metric => metric.name === name && metric.page === page)
			.map(item => item.value);
		result[element] = {
			hits: sliceData.length,
			p25: quantile(sliceData, 0.25),
			p50: quantile(sliceData, 0.50),
			p75: quantile(sliceData, 0.75),
			p95: quantile(sliceData, 0.95)
		}
	});

	console.table(result);
}

// рассчитывает все метрики за день
function calcMetricsByDate(data, page, date) {
	console.log(`Metrics for page ${page} on ${date}:`);

	let metricTypes = data.getTypes('metric');
	let result = {};

	let dataOnDate = data.getSlice('date', date);

	metricTypes.forEach(element => {
		let sliceData = dataOnDate
			.filter(metric => metric.name === element && metric.page === page)
			.map(item => item.value);
		result[element] = {
			hits: sliceData.length,
			p25: quantile(sliceData, 0.25),
			p50: quantile(sliceData, 0.50),
			p75: quantile(sliceData, 0.75),
			p95: quantile(sliceData, 0.95)
		}
	});

	console.table(result);
};

class Metric {
	constructor(data) {
		this.data = {};
		this.idsByReqId = {};
		this.idsByOs = {};
		this.idsByPlatform = {};
		this.idsByBrowser = {};
		this.idsByMetric = {};
		this.idsByDate = {}

		for (let i = 0; i < data.length; i++) {
			let id = String(Math.random()).substr(2, 12);
			this.data[id] = data[i];
			computeIfAbsent(this.idsByReqId, data[i].requestId, []).push(id);
			computeIfAbsent(this.idsByOs, data[i].additional.os, []).push(id);
			computeIfAbsent(this.idsByPlatform, data[i].additional.platform, []).push(id);
			computeIfAbsent(this.idsByBrowser, data[i].additional.browser, []).push(id);
			computeIfAbsent(this.idsByMetric, data[i].name, []).push(id);
			computeIfAbsent(this.idsByDate, data[i].date, []).push(id);
		}
	}

	getSlice(sliceName, type) {
		let result = [];
		switch (sliceName) {
			case 'os':
				result = this.idsByOs[type];
				break;
			case 'browser':
				result = this.idsByBrowser[type];
				break;
			case 'platform':
				result = this.idsByPlatform[type];
				break;
			case 'session':
				result = this.idsByReqId[type];
				break
			case 'metric':
				result = this.idsByMetric[type];
				break;
			case 'date':
				result = this.idsByDate[type];
				break;
			default:
		}
		return result.map(id => this.data[id]);
	}

	getTypes(sliceName) {
		switch (sliceName) {
			case 'date':
				return Object.keys(this.idsByDate);
			case 'os':
				return Object.keys(this.idsByOs);
			case 'platform':
				return Object.keys(this.idsByPlatform);
			case 'browser':
				return Object.keys(this.idsByBrowser);
			case 'metric':
				return Object.keys(this.idsByMetric);
			default:
		}
	}
}

function computeIfAbsent(object, key, computed) {
	let value = object[key];
	if (value == null || value == undefined) {
		object[key] = computed;

		return object[key];
	} else {
		return value;
	}
}

fetch('https://shri.yandex/hw/stat/data?counterId=1c0cc91c-cd16-498c-b9c1-379f16a57c27')
	.then(res => res.json())
	.then(result => {
		let data = prepareData(result);
		let metric = new Metric(data);

		calcMetricsByDate(metric, 'Main', '2021-10-31');

		showSession(metric, 'Main', '241390285045');

		showMetricByPeriod(metric, 'connect', '2021-10-31', '2021-11-01')

		showMetricByOs(metric, 'Main', 'connect');

		compareMetric([
			{
				data: metric.getSlice('os', 'Android 6.0'),
				name: 'Android 6.0'
			},
			{
				data: metric.getSlice('platform', 'mobile'),
				name: 'mobile'
			},
			{
				data: metric.getSlice('date', '2021-10-31'),
				name: '2021-10-31'
			},
		], 'LCP')
	});

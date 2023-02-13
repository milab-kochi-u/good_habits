// 初期値
const seed = 1;	// 乱数のシード値
const rangeOfInitialMotivation = [30, 80];	// 動機の高さ (0〜1) の初期値の範囲（×100）（30 → 実際は 0.3）
const rangeOfThresholdOfWorkChanging = [0, 5];	// ワークを変更する閾値の範囲（×100）（30 → 実際は 0.3）
// const rangeOfThresholdOfSchemeChanging = [0, 20];	// 工夫を変更する閾値の範囲（×100）（30 → 実際は 0.3）
const rangeOfCycleDays = [-10,10];	// 波長の周期の日数の範囲
// const rangeOfCycleHours = { 'user': [0, 8], 'work': [8, 16], 'scheme': [16, 24] };	// 24時間を3等分

// TODO:乱数の出力は整数であり，日数単位として扱っているので，今後時間単位の乱数として扱いたい

const numberOfCategories = 3;	// 1 にする場合は possibilityOfMultiCategory は 0 にすること
const numberOfUsers = 5;
const numberOfWorks = 5;
const numberOfSchemes = 10;
const possibilityOfMultiCategory = 0.3;	// 複数のカテゴリにまたがる可能性
const numberOfSignificantDigits = 2	// 有効桁数（乱数などの実数値の小数点以下の桁数が長くなりすぎるため）
const numberOfDaysForExperiment = 365 * 0.5;	// 実験期間の日数
const candidatesOfIntervalDaysForSelfReflection = [7, 14, 30];	// 振り返りを行う日数の候補

// https://lowreal.net/2019/06/20/1
Math.random.seed = (function me (s) {
	// Xorshift128 (init seed with Xorshift32)
	s ^= s << 13; s ^= 2 >>> 17; s ^= s << 5;
	let x = 123456789^s;
	s ^= s << 13; s ^= 2 >>> 17; s ^= s << 5;
	let y = 362436069^s;
	s ^= s << 13; s ^= 2 >>> 17; s ^= s << 5;
	let z = 521288629^s;
	s ^= s << 13; s ^= 2 >>> 17; s ^= s << 5;
	let w = 88675123^s;
	let t;
	Math.random = function () {
		t = x ^ (x << 11);
		x = y; y = z; z = w;
		// >>>0 means 'cast to uint32'
		w = ((w ^ (w >>> 19)) ^ (t ^ (t >>> 8)))>>>0;
		return w / 0x100000000;
	};
	Math.random.seed = me;
	return me;
})(0);

// https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Math/random
function getRandomInt(range) {
	min = range[0];
	max = range[1];
	min = Math.ceil(min);
	max = Math.floor(max);
	return Math.floor(Math.random() * (max - min) + min); //The maximum is exclusive and the minimum is inclusive
}

// 有効数字に丸める
function round(num, digits = numberOfSignificantDigits) {
	return Number.parseFloat(num.toFixed(digits));
}

// a, b の day 日めの相性を調べる（相性度: 0〜1, 大きいほど相性が良い）
// function checkChemistry(a, b, day) {
// 	const aPhase = Math.sin(Math.PI * 2 * (day * 24 - a['initialPhase']) / a['waveLength']);
// 	const bPhase = Math.sin(Math.PI * 2 * (day * 24 - b['initialPhase']) / b['waveLength']);
// 	return 1.0 - Math.abs(aPhase - bPhase) / 2;
// }

// 各カテゴリの優先度を決める（優先度: 0〜1, 大きいほど優先権が高い，相性度と乗算して利用する）
function decidePriorityOfCategories() {
	const priorities = new Array(numberOfCategories);
	priorities.fill(0);	// 優先度の初期値 = 0
	const firstCategoryNum = getRandomInt([0, numberOfCategories]);
	if (Math.random() < possibilityOfMultiCategory) {
		let secondCategoryNum;
		do {
			secondCategoryNum = getRandomInt([0, numberOfCategories]);
		} while (firstCategoryNum == secondCategoryNum);
		const priorityOfFirstCategory = round(Math.random());
		const priorityOfSecondCategory = round(1.0 - priorityOfFirstCategory);
		priorities[firstCategoryNum] = priorityOfFirstCategory;
		priorities[secondCategoryNum] = priorityOfSecondCategory;
		// TODO: 3つ以上のカテゴリに属するものもあるかもしれない？
	}
	else priorities[firstCategoryNum] = 1.0;
	return priorities;
}

// 乱数のシード値を指定（これにより，常に同じ乱数が生成される）
Math.random.seed(seed);

// Generate categories	// イメージ: 運動系, 勉強系, 日常生活系…など
const categories = [];
const cateDigits = parseInt(Math.log10(numberOfCategories)) + 1;
for (let i = 0; i < numberOfCategories; i++) {
	// const waveLength = getRandomInt(rangeOfCycleDays) * 24 + getRandomInt([0, 24]);
	const waveLength = getRandomInt(rangeOfCycleDays);
	const initialPhase = 0;
	const num = ('0'.repeat(cateDigits) + (i+1)).slice(-1 * cateDigits);
	const category = {
		'label': 'category' + num,
		'waveLength': waveLength,
		'initialPhase': initialPhase,
	};
	categories.push(category);
}
// console.log(categories);

// Generate works
const works = [];
const workDigits = parseInt(Math.log10(numberOfWorks)) + 1;
for (let i = 0; i < numberOfWorks; i++) {
	const num = ('0'.repeat(workDigits) + (i+1)).slice(-1 * workDigits);
	// const waveLength = getRandomInt(rangeOfCycleDays) * 24 + getRandomInt(rangeOfCycleHours['work']);
	const waveLength = getRandomInt(rangeOfCycleDays);
	const initialPhase = i+1;
	const priorityOfCategory = decidePriorityOfCategories();
	const work = {
		'label': 'work' + num,
		'waveLength': waveLength,
		'initialPhase': initialPhase,
		'priorityOfCategory': priorityOfCategory,
	};
	works.push(work);
}
// console.log(works);

// Generate schemes
const schemes = [];
const schemeDigits = parseInt(Math.log10(numberOfSchemes)) + 1;
for (let i = 0; i < numberOfSchemes; i++) {
	const num = ('0'.repeat(schemeDigits) + (i+1)).slice(-1 * schemeDigits);
	// const waveLength = getRandomInt(rangeOfCycleDays) * 24 + getRandomInt(rangeOfCycleHours['scheme']);
	const waveLength = getRandomInt(rangeOfCycleDays);
	const initialPhase = i+1;
	const priorityOfCategory = decidePriorityOfCategories();
	const scheme = {
		'label': 'scheme' + num,
		'waveLength': waveLength,
		'initialPhase': initialPhase,
		'priorityOfCategory': priorityOfCategory,
	};
	schemes.push(scheme);
}
// console.log(schemes);

// Generate users
const users = [];
const userDigits = parseInt(Math.log10(numberOfUsers)) + 1;
for (let i = 0; i < numberOfUsers; i++) {
	const num = ('0'.repeat(userDigits) + (i+1)).slice(-1 * userDigits);
	// const waveLength = getRandomInt(rangeOfCycleDays) * 24 + getRandomInt(rangeOfCycleHours['user']);
	const waveLength = getRandomInt(rangeOfCycleDays);
	const initialPhase = i+1;
	const priorityOfCategory = decidePriorityOfCategories();
	const startDays = getRandomInt([0, numberOfDaysForExperiment / 3]);
	const initialMotivation = round(getRandomInt(rangeOfInitialMotivation) / 100.0);
	const intervalDaysForSelfReflection = candidatesOfIntervalDaysForSelfReflection[getRandomInt([0, candidatesOfIntervalDaysForSelfReflection.length])];
	const thresholdOfWorkChanging = round(getRandomInt(rangeOfThresholdOfWorkChanging) / 100.0);
	// const thresholdOfSchemeChanging = round(getRandomInt(rangeOfThresholdOfSchemeChanging) / 100.0);
	const thresholdOfSchemeChanging = round(thresholdOfWorkChanging * 4);
	const user = {
		'name': 'user' + num,
		'waveLength': waveLength,
		'initialPhase': initialPhase,
		'priorityOfCategory': priorityOfCategory,
		'startDays': startDays,
		'initialMotivation': initialMotivation,
		'intervalDaysForSelfReflection': intervalDaysForSelfReflection,
		'thresholdOfWorkChanging': thresholdOfWorkChanging,
		'thresholdOfSchemeChanging': thresholdOfSchemeChanging,
	};
	users.push(user);
}
// console.log(users);

const dummydata = {
	'categories': categories,
	'works': works,
	'schemes': schemes,
	'users': users,
};
// console.log(dummydata);
console.log(JSON.stringify(dummydata));

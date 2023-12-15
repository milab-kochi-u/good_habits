// 初期値
const mathlib = require('./util/mathlib.js');
const yargs = require('yargs');

const argv = yargs
	.option('users', {
		alias: 'u',
		default: 20,
		type: 'number',
	})
	.check(args => {
		if(args._.length != 0) throw new Error('不明な引数が指定されています');
		if(args.users === parseInt(args.users) && 1 <= args.users && args.users <= 500) return true;
		else throw new Error('usersは1以上500以下の値を指定してください');
	}).parseSync();

const rangeOfInitialMotivation = [30, 80];	// 動機の高さ (0〜1) の初期値の範囲（×100）（30 → 実際は 0.3）
const rangeOfThresholdOfWorkChanging = [0, 5];	// ワークを変更する閾値の範囲（×100）（30 → 実際は 0.3）
// const rangeOfThresholdOfSchemeChanging = [0, 20];	// 工夫を変更する閾値の範囲（×100）（30 → 実際は 0.3）
const rangeOfCycleDays = [-10,10];	// 波長の周期の日数の範囲
// const rangeOfCycleHours = { 'user': [0, 8], 'work': [8, 16], 'scheme': [16, 24] };	// 24時間を3等分

// TODO:乱数の出力は整数であり，日数単位として扱っているので，今後時間単位の乱数として扱いたい

const numberOfCategories = 3;	// 1 にする場合は possibilityOfMultiCategory は 0 にすること
const numberOfUsers = argv.users; // default: 20
const numberOfWorks = 1;
const numberOfSchemes = 100;
const possibilityOfMultiCategory = 0.3;	// 複数のカテゴリにまたがる可能性
const numberOfSignificantDigits = 2	// 有効桁数（乱数などの実数値の小数点以下の桁数が長くなりすぎるため）
// const numberOfDaysForExperiment = 365 * 0.5;	// 実験期間の日数
const candidatesOfIntervalDaysForSelfReflection = [7, 14, 30];	// 振り返りを行う日数の候補

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
	const firstCategoryNum = mathlib.getRandomInt([0, numberOfCategories]);
	if (Math.random() < possibilityOfMultiCategory) {
		let secondCategoryNum;
		do {
			secondCategoryNum = mathlib.getRandomInt([0, numberOfCategories]);
		} while (firstCategoryNum == secondCategoryNum);
		const priorityOfFirstCategory = mathlib.round(Math.random());
		const priorityOfSecondCategory = mathlib.round(1.0 - priorityOfFirstCategory);
		priorities[firstCategoryNum] = priorityOfFirstCategory;
		priorities[secondCategoryNum] = priorityOfSecondCategory;
		// TODO: 3つ以上のカテゴリに属するものもあるかもしれない？
	}
	else priorities[firstCategoryNum] = 1.0;
	return priorities;
}

// Generate categories	// イメージ: 運動系, 勉強系, 日常生活系…など
const categories = [];
const cateDigits = parseInt(Math.log10(numberOfCategories)) + 1;
for (let i = 0; i < numberOfCategories; i++) {
	// const waveLength = mathlib.getRandomInt(rangeOfCycleDays) * 24 + mathlib.getRandomInt([0, 24]);
	const waveLength = mathlib.getRandomInt(rangeOfCycleDays);
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
	// const waveLength = mathlib.getRandomInt(rangeOfCycleDays) * 24 + mathlib.getRandomInt(rangeOfCycleHours['work']);
	const waveLength = mathlib.getRandomInt(rangeOfCycleDays);
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
	// const waveLength = mathlib.getRandomInt(rangeOfCycleDays) * 24 + mathlib.getRandomInt(rangeOfCycleHours['scheme']);
	const waveLength = mathlib.getRandomInt(rangeOfCycleDays);

	let chemistry_featureOfStart = mathlib.adjust(mathlib.round(mathlib.rnorm(0.2,0.5)));

	let chemistry_featureOfComplete = mathlib.adjust(mathlib.round(mathlib.rnorm(0.2,0.5)));

	const initialPhase = i+1;
	const priorityOfCategory = decidePriorityOfCategories();
	const scheme = {
		'label': 'scheme' + num,
		'waveLength': waveLength,
		'initialPhase': initialPhase,
		'priorityOfCategory': priorityOfCategory,
		'chemistry_featureOfStart': chemistry_featureOfStart,
		'chemistry_featureOfComplete': chemistry_featureOfComplete,
	};

	schemes.push(scheme);
}
// console.log(schemes);

// Generate users
const users = [];
const userDigits = parseInt(Math.log10(numberOfUsers)) + 1;
for (let i = 0; i < numberOfUsers; i++) {
	const num = ('0'.repeat(userDigits) + (i+1)).slice(-1 * userDigits);
	// const waveLength = mathlib.getRandomInt(rangeOfCycleDays) * 24 + mathlib.getRandomInt(rangeOfCycleHours['user']);
	const waveLength = mathlib.getRandomInt(rangeOfCycleDays);
	const initialPhase = i+1;
	const priorityOfCategory = decidePriorityOfCategories();
	// const startDays = mathlib.getRandomInt([0, numberOfDaysForExperiment / 3]);
	const startDays = mathlib.getRandomInt([0, 6]);
	// const initialMotivation = mathlib.round(mathlib.getRandomInt(rangeOfInitialMotivation) / 100.0);
	const initialMotivation = mathlib.round(mathlib.rnorm(0.2,0.5));
	const intervalDaysForSelfReflection = candidatesOfIntervalDaysForSelfReflection[mathlib.getRandomInt([0, candidatesOfIntervalDaysForSelfReflection.length])];
	const thresholdOfWorkChanging = mathlib.round(mathlib.getRandomInt(rangeOfThresholdOfWorkChanging) / 100.0);
	// const thresholdOfSchemeChanging = mathlib.round(mathlib.getRandomInt(rangeOfThresholdOfSchemeChanging) / 100.0);
	const thresholdOfSchemeChanging = mathlib.round(thresholdOfWorkChanging * 4);

	let featureOfStart = mathlib.adjust(mathlib.round(mathlib.rnorm(0.2,0.5)));

	let featureOfComplete = mathlib.adjust(mathlib.round(mathlib.rnorm(0.2,0.5)));

	// TODO: これを正規分布に合わせる
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
		'featureOfStart': featureOfStart,
		'featureOfComplete': featureOfComplete,
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

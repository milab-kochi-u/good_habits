// 初期値
const seed = 2;	// 乱数のシード値
const numberOfSignificantDigits = 2	// 有効桁数（乱数などの実数値の小数点以下の桁数が長くなりすぎるため）

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

// 乱数のシード値を指定（これにより，常に同じ乱数が生成される）
Math.random.seed(seed);

module.exports = {getRandomInt, round};
import test from'node:test';import assert from'node:assert/strict';import{calculateGeography as calc}from'../experiments/rag/geography-calculator.mjs';
test('Scale calculations use input values and preserve units',()=>{
 assert.match(calc('縮尺1:20000の地図で7cmは何kmですか').text,/1.4km/);
 assert.match(calc('2万5千分の1の地形図で2.5cmは何kmですか').text,/0.625km/);
 assert.equal(calc('縮尺1:25000の地図で2cmと3cmは何kmですか'),null);
 assert.equal(calc('縮尺1:25000の地図を拡大して2cmなら何kmですか'),null);
 assert.equal(calc('縮尺1:0の地図で2cmは何kmですか'),null);
});
test('Specified standard meridians handle direction, minutes and day rollover',()=>{
 assert.match(calc('日本が午後4時30分のとき、西経75度を標準時子午線とする地域は何時ですか').text,/同日2時30分/);
 assert.match(calc('日本が午前2時のとき、東経0度を標準時子午線とする地域は何時ですか').text,/前日17時/);
 assert.match(calc('日本が23時のとき、東経180度を標準時子午線とする地域は何時ですか').text,/翌日2時/);
 assert.equal(calc('日本が午後3時のときロンドンは何時ですか'),null);
 assert.equal(calc('日本が午後3時のとき、東経0度を標準時子午線とする地域は何時ですか。夏時間を使います'),null);
 assert.equal(calc('日本が午後3時のとき、東経0度と西経75度を標準時子午線とする地域は何時ですか'),null);
});

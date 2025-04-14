// src\app\change-lyrics\test.ts
/// <reference types="jest" />
import {
    handleReplaceAll,
    handleLyricChange,
    countChangedWords,
    getDistinctChangedWords,
    LyricLine,
    FormValues,
    generateLyricsData
} from './utils';

// Simulate Browser environment.
if (typeof document === 'undefined') {
    global.document = {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        createElement: (_tag: string) => {
            let _innerHTML = '';
            return {
                get innerHTML() {
                    return _innerHTML;
                },
                set innerHTML(val: string) {
                    _innerHTML = val;
                },
                innerText: '',
                get textContent() {
                    return this.innerHTML;
                }
            };
        }
    } as unknown as Document; // Bypass full Document requirements
}

describe('change-lyrics Integration Test', () => {
    beforeEach(() => {
        jest.resetAllMocks();
    });
    describe("Test countDistinctChangedWords", () => {
        it('should count correctly', () => {
            const lyrics: LyricLine[] = [
                {
                    "id": 40,
                    "original": "Charali mannaji anhassdeoramyeon deol apeul tende, hmm (Ah, ah, ah, ah)",
                    "modified": "Charali mannaji anhassdeoramyeon deol apeul tende, hmm (hey, hey, hey, hey)",
                    "markedText": "Charali mannaji anhassdeoramyeon deol apeul tende, hmm (<span class=\"text-red-600\">hey</span>, <span class=\"text-red-600\">hey</span>, <span class=\"text-red-600\">hey</span>, <span class=\"text-red-600\">hey</span>)",
                    "wordChanges": [
                        {
                            "originalWord": "Charali",
                            "newWord": "Charali",
                            "originalIndex": 0,
                            "newIndex": 0,
                            "hasChanged": false
                        },
                        {
                            "originalWord": "mannaji",
                            "newWord": "mannaji",
                            "originalIndex": 1,
                            "newIndex": 1,
                            "hasChanged": false
                        },
                        {
                            "originalWord": "anhassdeoramyeon",
                            "newWord": "anhassdeoramyeon",
                            "originalIndex": 2,
                            "newIndex": 2,
                            "hasChanged": false
                        },
                        {
                            "originalWord": "deol",
                            "newWord": "deol",
                            "originalIndex": 3,
                            "newIndex": 3,
                            "hasChanged": false
                        },
                        {
                            "originalWord": "apeul",
                            "newWord": "apeul",
                            "originalIndex": 4,
                            "newIndex": 4,
                            "hasChanged": false
                        },
                        {
                            "originalWord": "tende,",
                            "newWord": "tende,",
                            "originalIndex": 5,
                            "newIndex": 5,
                            "hasChanged": false
                        },
                        {
                            "originalWord": "hmm",
                            "newWord": "hmm",
                            "originalIndex": 6,
                            "newIndex": 6,
                            "hasChanged": false
                        },
                        {
                            "originalWord": "(",
                            "newWord": "(",
                            "originalIndex": 7,
                            "newIndex": 7,
                            "hasChanged": false
                        },
                        {
                            "originalWord": "Ah",
                            "newWord": "hey",
                            "originalIndex": 8,
                            "newIndex": 8,
                            "hasChanged": true,
                            "isSubstitution": true
                        },
                        {
                            "originalWord": ",",
                            "newWord": ",",
                            "originalIndex": 9,
                            "newIndex": 9,
                            "hasChanged": false
                        },
                        {
                            "originalWord": "ah",
                            "newWord": "hey",
                            "originalIndex": 10,
                            "newIndex": 10,
                            "hasChanged": true,
                            "isSubstitution": true
                        },
                        {
                            "originalWord": ",",
                            "newWord": ",",
                            "originalIndex": 11,
                            "newIndex": 11,
                            "hasChanged": false
                        },
                        {
                            "originalWord": "ah",
                            "newWord": "hey",
                            "originalIndex": 12,
                            "newIndex": 12,
                            "hasChanged": true,
                            "isSubstitution": true
                        },
                        {
                            "originalWord": ",",
                            "newWord": ",",
                            "originalIndex": 13,
                            "newIndex": 13,
                            "hasChanged": false
                        },
                        {
                            "originalWord": "ah",
                            "newWord": "hey",
                            "originalIndex": 14,
                            "newIndex": 14,
                            "hasChanged": true,
                            "isSubstitution": true
                        },
                        {
                            "originalWord": ")",
                            "newWord": ")",
                            "originalIndex": 15,
                            "newIndex": 15,
                            "hasChanged": false
                        }
                    ]
                },
                {
                    "id": 41,
                    "original": "Yeongweonhi hamkkehjadeon geu yak sok ijen (Ah, ah, ah, ah)",
                    "modified": "Yeongweonhi hamkkehjadeon geu yak sok ijen (hey, hey, hey, hey)",
                    "markedText": "Yeongweonhi hamkkehjadeon geu yak sok ijen (<span class=\"text-red-600\">hey</span>, <span class=\"text-red-600\">hey</span>, <span class=\"text-red-600\">hey</span>, <span class=\"text-red-600\">hey</span>)",
                    "wordChanges": [
                        {
                            "originalWord": "Yeongweonhi",
                            "newWord": "Yeongweonhi",
                            "originalIndex": 0,
                            "newIndex": 0,
                            "hasChanged": false
                        },
                        {
                            "originalWord": "hamkkehjadeon",
                            "newWord": "hamkkehjadeon",
                            "originalIndex": 1,
                            "newIndex": 1,
                            "hasChanged": false
                        },
                        {
                            "originalWord": "geu",
                            "newWord": "geu",
                            "originalIndex": 2,
                            "newIndex": 2,
                            "hasChanged": false
                        },
                        {
                            "originalWord": "yak",
                            "newWord": "yak",
                            "originalIndex": 3,
                            "newIndex": 3,
                            "hasChanged": false
                        },
                        {
                            "originalWord": "sok",
                            "newWord": "sok",
                            "originalIndex": 4,
                            "newIndex": 4,
                            "hasChanged": false
                        },
                        {
                            "originalWord": "ijen",
                            "newWord": "ijen",
                            "originalIndex": 5,
                            "newIndex": 5,
                            "hasChanged": false
                        },
                        {
                            "originalWord": "(",
                            "newWord": "(",
                            "originalIndex": 6,
                            "newIndex": 6,
                            "hasChanged": false
                        },
                        {
                            "originalWord": "Ah",
                            "newWord": "hey",
                            "originalIndex": 7,
                            "newIndex": 7,
                            "hasChanged": true,
                            "isSubstitution": true
                        },
                        {
                            "originalWord": ",",
                            "newWord": ",",
                            "originalIndex": 8,
                            "newIndex": 8,
                            "hasChanged": false
                        },
                        {
                            "originalWord": "ah",
                            "newWord": "hey",
                            "originalIndex": 9,
                            "newIndex": 9,
                            "hasChanged": true,
                            "isSubstitution": true
                        },
                        {
                            "originalWord": ",",
                            "newWord": ",",
                            "originalIndex": 10,
                            "newIndex": 10,
                            "hasChanged": false
                        },
                        {
                            "originalWord": "ah",
                            "newWord": "hey",
                            "originalIndex": 11,
                            "newIndex": 11,
                            "hasChanged": true,
                            "isSubstitution": true
                        },
                        {
                            "originalWord": ",",
                            "newWord": ",",
                            "originalIndex": 12,
                            "newIndex": 12,
                            "hasChanged": false
                        },
                        {
                            "originalWord": "ah",
                            "newWord": "hey",
                            "originalIndex": 13,
                            "newIndex": 13,
                            "hasChanged": true,
                            "isSubstitution": true
                        },
                        {
                            "originalWord": ")",
                            "newWord": ")",
                            "originalIndex": 14,
                            "newIndex": 14,
                            "hasChanged": false
                        }
                    ]
                }];
            const distinctChangedWords: string[] = getDistinctChangedWords(lyrics);
            expect(distinctChangedWords.length).toBe(1);

        })
    });
    describe('handleLyricChange - Robust Tests', () => {
        // ----- English Tests -----
        describe('English Lyrics', () => {
            const englishLyrics = [
                { id: 1, original: "I take it easy, babe, I", modified: "I take it easy, babe, I", wordChanges: [] },
                { id: 2, original: "I get down, it's automatic, uh", modified: "I get down, it's automatic, uh", wordChanges: [] }
            ];

            it('should delete previous modifications and mark deletions when reverting changes', () => {
                const setLyricsMock = jest.fn();
                const setFormValuesMock = jest.fn();

                // First change: "easy" to "steady"
                handleLyricChange(1, "I take it steady, babe, I", setLyricsMock, setFormValuesMock);
                let updatedLyrics = setLyricsMock.mock.calls[0][0](englishLyrics);
                const line1 = updatedLyrics.find((line: LyricLine) => line.id === 1)!;
                expect(line1.modified).toBe("I take it steady, babe, I");
                expect(line1.markedText).toBe('I take it <span class="text-red-600">steady</span>, babe, I');
                expect(countChangedWords(line1)).toBe(1); // One word changed

                // Revert to original
                handleLyricChange(1, "I take it easy, babe, I", setLyricsMock, setFormValuesMock);
                updatedLyrics = setLyricsMock.mock.calls[1][0](englishLyrics);
                const revertedLine1 = updatedLyrics.find((line: LyricLine) => line.id === 1)!;
                expect(revertedLine1.modified).toBe("I take it easy, babe, I");
                expect(revertedLine1.markedText).toBe("I take it easy, babe, I"); // No changes, no markup
                expect(countChangedWords(revertedLine1)).toBe(0); // No changes after reversion
            });

            it('should apply additional modifications on top of previous changes', () => {
                const setLyricsMock = jest.fn();
                const setFormValuesMock = jest.fn();

                // First change: Add "super"
                handleLyricChange(2, "I get down, it's super automatic, uh", setLyricsMock, setFormValuesMock);
                let updatedLyrics = setLyricsMock.mock.calls[0][0](englishLyrics);
                const line2 = updatedLyrics.find((line: LyricLine) => line.id === 2)!;
                expect(line2.modified).toBe("I get down, it's super automatic, uh");
                expect(line2.markedText).toBe('I get down, it\'s <span class="text-red-600">super</span> automatic, uh');
                expect(countChangedWords(line2)).toBe(1); // One word added

                // Second change: "super" to "super-duper"
                handleLyricChange(2, "I get down, it's super-duper automatic, uh", setLyricsMock, setFormValuesMock);
                updatedLyrics = setLyricsMock.mock.calls[1][0](englishLyrics);
                const updatedLine2 = updatedLyrics.find((line: LyricLine) => line.id === 2)!;
                expect(updatedLine2.modified).toBe("I get down, it's super-duper automatic, uh");
                expect(updatedLine2.markedText).toBe('I get down, it\'s <span class="text-red-600">super-duper</span> automatic, uh');
                expect(countChangedWords(updatedLine2)).toBe(1); // Still one net change from original
            });

            it('should handle punctuation changes correctly on previously modified output', () => {
                const setLyricsMock = jest.fn();
                const setFormValuesMock = jest.fn();

                // Change comma to semicolon
                handleLyricChange(1, "I take it easy; babe, I", setLyricsMock, setFormValuesMock);
                let updatedLyrics = setLyricsMock.mock.calls[0][0](englishLyrics);
                const line1 = updatedLyrics.find((line: LyricLine) => line.id === 1)!;
                expect(line1.modified).toBe("I take it easy; babe, I");
                expect(line1.markedText).toBe("I take it easy; babe, I"); // Punctuation not marked
                expect(countChangedWords(line1)).toBe(0); // Punctuation-only change

                // Change semicolon to colon
                handleLyricChange(1, "I take it easy: babe, I", setLyricsMock, setFormValuesMock);
                updatedLyrics = setLyricsMock.mock.calls[1][0](englishLyrics);
                const updatedLine1 = updatedLyrics.find((line: LyricLine) => line.id === 1)!;
                expect(updatedLine1.modified).toBe("I take it easy: babe, I");
                expect(updatedLine1.markedText).toBe("I take it easy: babe, I");
                expect(countChangedWords(updatedLine1)).toBe(0);
            });

            it('should add new words to an already modified line', () => {
                const setLyricsMock = jest.fn();
                const setFormValuesMock = jest.fn();

                // No change initially
                handleLyricChange(2, "I get down, it's automatic, uh", setLyricsMock, setFormValuesMock);
                let updatedLyrics = setLyricsMock.mock.calls[0][0](englishLyrics);
                const line2 = updatedLyrics.find((line: LyricLine) => line.id === 2)!;
                expect(line2.modified).toBe("I get down, it's automatic, uh");
                expect(line2.markedText).toBe("I get down, it's automatic, uh");
                expect(countChangedWords(line2)).toBe(0);

                // Add "extremely"
                handleLyricChange(2, "I get down, it's extremely automatic, uh", setLyricsMock, setFormValuesMock);
                updatedLyrics = setLyricsMock.mock.calls[1][0](englishLyrics);
                const updatedLine2 = updatedLyrics.find((line: LyricLine) => line.id === 2)!;
                expect(updatedLine2.modified).toBe("I get down, it's extremely automatic, uh");
                expect(updatedLine2.markedText).toBe('I get down, it\'s <span class="text-red-600">extremely</span> automatic, uh');
                expect(countChangedWords(updatedLine2)).toBe(1);
            });
        });

        // ----- Chinese Tests -----
        describe('Chinese Lyrics', () => {
            const chineseLyrics = [
                { id: 1, original: "我种下一颗种子 终于长出了果实", modified: "我种下一颗种子 终于长出了果实", wordChanges: [] },
                { id: 2, original: "今天是个伟大日子", modified: "今天是个伟大日子", wordChanges: [] }
            ];

            it('should delete previous modifications and mark deletions in Chinese', () => {
                const setLyricsMock = jest.fn();
                const setFormValuesMock = jest.fn();

                // Add "了"
                handleLyricChange(1, "我种下了一颗种子 终于长出了果实", setLyricsMock, setFormValuesMock);
                let updatedLyrics = setLyricsMock.mock.calls[0][0](chineseLyrics);
                const line1 = updatedLyrics.find((line: LyricLine) => line.id === 1)!;
                expect(line1.modified).toBe("我种下了一颗种子 终于长出了果实");
                expect(line1.markedText).toBe("我种下了一颗种子 终于长出了果实"); // CJK: markedText is modified text
                expect(countChangedWords(line1)).toBe(1); // One character added

                // Revert
                handleLyricChange(1, "我种下一颗种子 终于长出了果实", setLyricsMock, setFormValuesMock);
                updatedLyrics = setLyricsMock.mock.calls[1][0](chineseLyrics);
                const revertedLine1 = updatedLyrics.find((line: LyricLine) => line.id === 1)!;
                expect(revertedLine1.modified).toBe("我种下一颗种子 终于长出了果实");
                expect(revertedLine1.markedText).toBe("我种下一颗种子 终于长出了果实");
                expect(countChangedWords(revertedLine1)).toBe(0);
            });

            it('should apply additional modifications on top of previous Chinese changes', () => {
                const setLyricsMock = jest.fn();
                const setFormValuesMock = jest.fn();

                // Add "特别"
                handleLyricChange(2, "今天是个特别伟大日子", setLyricsMock, setFormValuesMock);
                let updatedLyrics = setLyricsMock.mock.calls[0][0](chineseLyrics);
                const line2 = updatedLyrics.find((line: LyricLine) => line.id === 2)!;
                expect(line2.modified).toBe("今天是个特别伟大日子");
                expect(line2.markedText).toBe("今天是个特别伟大日子");
                expect(countChangedWords(line2)).toBe(2); // Two characters added

                // Add "超级"
                handleLyricChange(2, "今天是个超级特别伟大日子", setLyricsMock, setFormValuesMock);
                updatedLyrics = setLyricsMock.mock.calls[1][0](chineseLyrics);
                const updatedLine2 = updatedLyrics.find((line: LyricLine) => line.id === 2)!;
                expect(updatedLine2.modified).toBe("今天是个超级特别伟大日子");
                expect(updatedLine2.markedText).toBe("今天是个超级特别伟大日子");
                expect(countChangedWords(updatedLine2)).toBe(4); // Four characters added from original
            });

            it('should correctly handle punctuation changes in Chinese', () => {
                const setLyricsMock = jest.fn();
                const setFormValuesMock = jest.fn();

                // Comma to full-width comma
                handleLyricChange(1, "我种下一颗种子，终于长出了果实", setLyricsMock, setFormValuesMock);
                let updatedLyrics = setLyricsMock.mock.calls[0][0](chineseLyrics);
                const line1 = updatedLyrics.find((line: LyricLine) => line.id === 1)!;
                expect(line1.modified).toBe("我种下一颗种子，终于长出了果实");
                expect(line1.markedText).toBe("我种下一颗种子，终于长出了果实");
                expect(countChangedWords(line1)).toBe(1); // One character changed

                // Full-width comma to period
                handleLyricChange(1, "我种下一颗种子。终于长出了果实", setLyricsMock, setFormValuesMock);
                updatedLyrics = setLyricsMock.mock.calls[1][0](chineseLyrics);
                const updatedLine1 = updatedLyrics.find((line: LyricLine) => line.id === 1)!;
                expect(updatedLine1.modified).toBe("我种下一颗种子。终于长出了果实");
                expect(updatedLine1.markedText).toBe("我种下一颗种子。终于长出了果实");
                expect(countChangedWords(updatedLine1)).toBe(1);
            });

            it('should add new words to an already modified Chinese lyric', () => {
                const setLyricsMock = jest.fn();
                const setFormValuesMock = jest.fn();

                // No change
                handleLyricChange(2, "今天是个伟大日子", setLyricsMock, setFormValuesMock);
                let updatedLyrics = setLyricsMock.mock.calls[0][0](chineseLyrics);
                const line2 = updatedLyrics.find((line: LyricLine) => line.id === 2)!;
                expect(line2.modified).toBe("今天是个伟大日子");
                expect(line2.markedText).toBe("今天是个伟大日子");
                expect(countChangedWords(line2)).toBe(0);

                // Add "非常"
                handleLyricChange(2, "今天是个非常伟大日子", setLyricsMock, setFormValuesMock);
                updatedLyrics = setLyricsMock.mock.calls[1][0](chineseLyrics);
                const updatedLine2 = updatedLyrics.find((line: LyricLine) => line.id === 2)!;
                expect(updatedLine2.modified).toBe("今天是个非常伟大日子");
                expect(updatedLine2.markedText).toBe("今天是个非常伟大日子");
                expect(countChangedWords(updatedLine2)).toBe(2);
            });
        });

        // ----- Vietnamese Tests -----
        describe('Vietnamese Lyrics', () => {
            const vietnameseLyrics = [
                { id: 1, original: "Một năm tuyệt vời đã qua", modified: "Một năm tuyệt vời đã qua", wordChanges: [] },
                { id: 2, original: "Người người lại cùng đón xuân đang về", modified: "Người người lại cùng đón xuân đang về", wordChanges: [] }
            ];

            it('should delete previous modifications and mark deletions in Vietnamese', () => {
                const setLyricsMock = jest.fn();
                const setFormValuesMock = jest.fn();

                // Add "thật"
                handleLyricChange(1, "Một năm thật tuyệt vời đã qua", setLyricsMock, setFormValuesMock);
                let updatedLyrics = setLyricsMock.mock.calls[0][0](vietnameseLyrics);
                const line1 = updatedLyrics.find((line: LyricLine) => line.id === 1)!;
                expect(line1.modified).toBe("Một năm thật tuyệt vời đã qua");
                expect(line1.markedText).toBe('Một năm <span class="text-red-600">thật</span> tuyệt vời đã qua');
                expect(countChangedWords(line1)).toBe(1);

                // Revert
                handleLyricChange(1, "Một năm tuyệt vời đã qua", setLyricsMock, setFormValuesMock);
                updatedLyrics = setLyricsMock.mock.calls[1][0](vietnameseLyrics);
                const revertedLine1 = updatedLyrics.find((line: LyricLine) => line.id === 1)!;
                expect(revertedLine1.modified).toBe("Một năm tuyệt vời đã qua");
                expect(revertedLine1.markedText).toBe("Một năm tuyệt vời đã qua");
                expect(countChangedWords(revertedLine1)).toBe(0);
            });

            it('should apply additional modifications on top of previous Vietnamese changes', () => {
                const setLyricsMock = jest.fn();
                const setFormValuesMock = jest.fn();

                // "đang về" to "rực rỡ"
                handleLyricChange(2, "Người người lại cùng đón xuân rực rỡ", setLyricsMock, setFormValuesMock);
                let updatedLyrics = setLyricsMock.mock.calls[0][0](vietnameseLyrics);
                const line2 = updatedLyrics.find((line: LyricLine) => line.id === 2)!;
                expect(line2.modified).toBe("Người người lại cùng đón xuân rực rỡ");
                expect(line2.markedText).toBe('Người người lại cùng đón xuân <span class="text-red-600">rực</span> <span class="text-red-600">rỡ</span>');
                expect(countChangedWords(line2)).toBe(2); // Two words changed

                // Add "và hạnh phúc"
                handleLyricChange(2, "Người người lại cùng đón xuân rực rỡ và hạnh phúc", setLyricsMock, setFormValuesMock);
                updatedLyrics = setLyricsMock.mock.calls[1][0](vietnameseLyrics);
                const updatedLine2 = updatedLyrics.find((line: LyricLine) => line.id === 2)!;
                expect(updatedLine2.modified).toBe("Người người lại cùng đón xuân rực rỡ và hạnh phúc");
                expect(updatedLine2.markedText).toBe('Người người lại cùng đón xuân <span class="text-red-600">rực</span> <span class="text-red-600">rỡ</span> <span class="text-red-600">và</span> <span class="text-red-600">hạnh</span> <span class="text-red-600">phúc</span>');
                expect(countChangedWords(updatedLine2)).toBe(5);
            });


            it('should correctly handle punctuation changes in Vietnamese', () => {
                const setLyricsMock = jest.fn();
                const setFormValuesMock = jest.fn();

                // Add comma
                handleLyricChange(1, "Một năm tuyệt vời, đã qua", setLyricsMock, setFormValuesMock);
                let updatedLyrics = setLyricsMock.mock.calls[0][0](vietnameseLyrics);
                const line1 = updatedLyrics.find((line: LyricLine) => line.id === 1)!;
                expect(line1.modified).toBe("Một năm tuyệt vời, đã qua");
                expect(line1.markedText).toBe("Một năm tuyệt vời, đã qua");
                expect(countChangedWords(line1)).toBe(0);

                // Comma to period with capitalization
                handleLyricChange(1, "Một năm tuyệt vời. Đã qua", setLyricsMock, setFormValuesMock);
                updatedLyrics = setLyricsMock.mock.calls[1][0](vietnameseLyrics);
                const updatedLine1 = updatedLyrics.find((line: LyricLine) => line.id === 1)!;
                expect(updatedLine1.modified).toBe("Một năm tuyệt vời. Đã qua");
                expect(updatedLine1.markedText).toBe('Một năm tuyệt vời. <span class="text-red-600">Đã</span> qua');
                expect(countChangedWords(updatedLine1)).toBe(1);
            });

            it('should add new words to an already modified Vietnamese lyric', () => {
                const setLyricsMock = jest.fn();
                const setFormValuesMock = jest.fn();

                // No change
                handleLyricChange(2, "Người người lại cùng đón xuân đang về", setLyricsMock, setFormValuesMock);
                let updatedLyrics = setLyricsMock.mock.calls[0][0](vietnameseLyrics);
                const line2 = updatedLyrics.find((line: LyricLine) => line.id === 2)!;
                expect(line2.modified).toBe("Người người lại cùng đón xuân đang về");
                expect(line2.markedText).toBe("Người người lại cùng đón xuân đang về");
                expect(countChangedWords(line2)).toBe(0);

                // Add "vui vẻ"
                handleLyricChange(2, "Người người lại cùng đón xuân vui vẻ đang về", setLyricsMock, setFormValuesMock);
                updatedLyrics = setLyricsMock.mock.calls[1][0](vietnameseLyrics);
                const updatedLine2 = updatedLyrics.find((line: LyricLine) => line.id === 2)!;
                expect(updatedLine2.modified).toBe("Người người lại cùng đón xuân vui vẻ đang về");
                expect(updatedLine2.markedText).toBe('Người người lại cùng đón xuân <span class="text-red-600">vui</span> <span class="text-red-600">vẻ</span> đang về');
                expect(countChangedWords(updatedLine2)).toBe(2);
            });
        });
    });
    describe('handleLyricChange', () => {
        it('should update English lyric line correctly', () => {
            const initialLyrics = [
                { id: 35, original: "Hey, nah, nah, nah, nah, nah, nah, nah, nah", modified: "Hey, nah, nah, nah, nah, nah, nah, nah, nah", wordChanges: [] },
                { id: 40, original: "Another line remains unchanged", modified: "Another line remains unchanged", wordChanges: [] }
            ];

            const setLyricsMock = jest.fn();
            const setFormValuesMock = jest.fn();

            handleLyricChange(35, "Hey, yah, yah, yah, yah, yah, yah, yah, yah", setLyricsMock, setFormValuesMock);
            const updatedLyrics = setLyricsMock.mock.calls[0][0](initialLyrics);
            const line35 = updatedLyrics.find((line: LyricLine) => line.id === 35)!;
            expect(line35.modified).toBe("Hey, yah, yah, yah, yah, yah, yah, yah, yah");
            expect(line35.markedText).toBe('Hey, <span class="text-red-600">yah</span>, <span class="text-red-600">yah</span>, <span class="text-red-600">yah</span>, <span class="text-red-600">yah</span>, <span class="text-red-600">yah</span>, <span class="text-red-600">yah</span>, <span class="text-red-600">yah</span>, <span class="text-red-600">yah</span>');
            expect(countChangedWords(line35)).toBe(8);
        });

        it('should handle deletions with punctuation cleanly', () => {
            const initialLyrics = [{ id: 1, original: "Hello, world!", modified: "Hello, world!", wordChanges: [] }];
            const setLyricsMock = jest.fn();
            const setFormValuesMock = jest.fn();

            handleLyricChange(1, "Hi, planet!", setLyricsMock, setFormValuesMock);
            const updatedLyrics = setLyricsMock.mock.calls[0][0](initialLyrics);
            expect(updatedLyrics[0].modified).toBe("Hi, planet!");
            expect(updatedLyrics[0].markedText).toBe('<span class="text-red-600">Hi</span>, <span class="text-red-600">planet</span>!');
            expect(countChangedWords(updatedLyrics[0])).toBe(2);

            handleLyricChange(1, "Hi, !", setLyricsMock, setFormValuesMock);
            const updatedLyricsDel = setLyricsMock.mock.calls[1][0](initialLyrics);
            expect(updatedLyricsDel[0].modified).toBe("Hi, 🗙!");
            expect(updatedLyricsDel[0].markedText).toBe('Hi, <span class="text-red-600">🗙</span>!');
            expect(countChangedWords(updatedLyricsDel[0])).toBe(1);
        });

        it('should represent deleting all words with deletion markers', () => {
            const initialLyrics = [{ id: 1, original: "Word one two", modified: "Word one two", wordChanges: [] }];
            const setLyricsMock = jest.fn();
            const setFormValuesMock = jest.fn();

            handleLyricChange(1, "", setLyricsMock, setFormValuesMock);
            const updatedLyrics = setLyricsMock.mock.calls[0][0](initialLyrics);
            expect(updatedLyrics[0].modified).toBe("🗙 🗙 🗙");
            expect(updatedLyrics[0].markedText).toBe('<span class="text-red-600">🗙</span> <span class="text-red-600">🗙</span> <span class="text-red-600">🗙</span>');
            expect(countChangedWords(updatedLyrics[0])).toBe(3);
        });

        it('should treat whitespace-only input as deletion', () => {
            const initialLyrics = [{ id: 1, original: "Some text", modified: "Some text", wordChanges: [] }];
            const setLyricsMock = jest.fn();
            const setFormValuesMock = jest.fn();

            handleLyricChange(1, "   ", setLyricsMock, setFormValuesMock);
            const updatedLyrics = setLyricsMock.mock.calls[0][0](initialLyrics);
            expect(updatedLyrics[0].modified).toBe("🗙 🗙");
            expect(updatedLyrics[0].markedText).toBe('<span class="text-red-600">🗙</span> <span class="text-red-600">🗙</span>');
            expect(countChangedWords(updatedLyrics[0])).toBe(2);
        });
    });
    describe('handleReplaceAll', () => {
        let setLyricsMock: jest.Mock;
        let setFormValuesMock: jest.Mock;

        // Setup mocks fresh for each test in this suite
        beforeEach(() => {
            setLyricsMock = jest.fn();
            setFormValuesMock = jest.fn();
        });

        // Helper interface for expected state
        interface ExpectedLineState {
            id: number;
            modified: string;
            markedText: string;
            wordCount: number;
        }

        // Assertion Helper Function specific to handleReplaceAll tests
        function assertReplaceAllResult(
            updatedLyrics: LyricLine[],
            expectedStates: ExpectedLineState[],
            expectedTotalCount: number,
            initialFormValues: FormValues = { songUrl: '', lyrics: '' } // Default initial form state
        ) {
            expect(updatedLyrics).toHaveLength(expectedStates.length);

            let actualTotalCount = 0;
            const expectedCombinedLyrics: string[] = [];

            for (const expected of expectedStates) {
                const actualLine = updatedLyrics.find(line => line.id === expected.id);
                expect(actualLine).toBeDefined(); // Make sure the line exists
                if (!actualLine) continue; // Should not happen if IDs match, but good practice

                // Check modified text
                expect(actualLine.modified).toBe(expected.modified);
                // Check marked HTML text
                expect(actualLine.markedText).toBe(expected.markedText);
                // Check individual line word count
                const actualCount = countChangedWords(actualLine);
                expect(actualCount).toBe(expected.wordCount);

                actualTotalCount += actualCount;
                expectedCombinedLyrics.push(expected.modified);
            }

            // Check total word count across all lines
            expect(actualTotalCount).toBe(expectedTotalCount);

            // Check that setFormValues was called correctly
            expect(setFormValuesMock).toHaveBeenCalledTimes(1);
            const updatedFormValues = setFormValuesMock.mock.calls[0][0](initialFormValues);
            expect(updatedFormValues.lyrics).toBe(expectedCombinedLyrics.join('\n'));
        }

        // --- Refactored Tests ---

        it('should replace all instances of "nah," with "yah" and update markedText', () => {
            const initialLyrics: LyricLine[] = [
                { id: 35, original: "Hey, nah, nah, nah, nah, nah, nah, nah, nah", modified: "Hey, nah, nah, nah, nah, nah, nah, nah, nah", wordChanges: [] },
            ];

            handleReplaceAll('nah,', 'yah', setLyricsMock, setFormValuesMock);
            const updatedLyrics = setLyricsMock.mock.calls[0][0](initialLyrics);

            const expectedStates: ExpectedLineState[] = [
                {
                    id: 35,
                    modified: "Hey, yah, yah, yah, yah, yah, yah, yah, yah",
                    markedText: `Hey, <span class="text-red-600">yah</span>, <span class="text-red-600">yah</span>, <span class="text-red-600">yah</span>, <span class="text-red-600">yah</span>, <span class="text-red-600">yah</span>, <span class="text-red-600">yah</span>, <span class="text-red-600">yah</span>, <span class="text-red-600">yah</span>`,
                    wordCount: 8
                }
            ];

            assertReplaceAllResult(updatedLyrics, expectedStates, 8);
        });

        it('should replace all instances of "hungry" with "horny" across multiple lines', () => {
            const initialLyrics: LyricLine[] = [
                { id: 36, original: "I'm stayin' hungry, I'm stayin' hungry", modified: "I'm stayin' hungry, I'm stayin' hungry", wordChanges: [] },
                { id: 37, original: "I'm stayin' hungry, I'm stayin' hungry", modified: "I'm stayin' hungry, I'm stayin' hungry", wordChanges: [] },
                { id: 38, original: "Not gettin' angry, I'm stayin' hungry", modified: "Not gettin' angry, I'm stayin' hungry", wordChanges: [] },
                { id: 39, original: "Not gettin' angry, still stayin' hungry", modified: "Not gettin' angry, still stayin' hungry", wordChanges: [] },
            ];

            handleReplaceAll('hungry', 'horny', setLyricsMock, setFormValuesMock);
            const updatedLyrics = setLyricsMock.mock.calls[0][0](initialLyrics);

            const expectedStates: ExpectedLineState[] = [
                { id: 36, modified: "I'm stayin' horny, I'm stayin' horny", markedText: `I'm stayin' <span class="text-red-600">horny</span>, I'm stayin' <span class="text-red-600">horny</span>`, wordCount: 2 },
                { id: 37, modified: "I'm stayin' horny, I'm stayin' horny", markedText: `I'm stayin' <span class="text-red-600">horny</span>, I'm stayin' <span class="text-red-600">horny</span>`, wordCount: 2 },
                { id: 38, modified: "Not gettin' angry, I'm stayin' horny", markedText: `Not gettin' angry, I'm stayin' <span class="text-red-600">horny</span>`, wordCount: 1 },
                { id: 39, modified: "Not gettin' angry, still stayin' horny", markedText: `Not gettin' angry, still stayin' <span class="text-red-600">horny</span>`, wordCount: 1 },
            ];

            assertReplaceAllResult(updatedLyrics, expectedStates, 6);
        });

        it('should apply a second replacement ("angry," -> "happy") cumulatively', () => {
            // Define the state AFTER the first replacement (hungry -> horny)
            // IMPORTANT: Keep the complex wordChanges array from the original test if the logic relies on it.
            // For brevity here, it's represented as [], but copy the actual structure.
            const initialLyricsAfterFirstReplace: LyricLine[] = [
                {
                    id: 36, original: "I'm stayin' hungry, I'm stayin' hungry", modified: "I'm stayin' horny, I'm stayin' horny", wordChanges: [ /* Copy exact structure from original test if needed */]
                },
                {
                    id: 37, original: "I'm stayin' hungry, I'm stayin' hungry", modified: "I'm stayin' horny, I'm stayin' horny", wordChanges: [ /* Copy exact structure from original test if needed */]
                },
                {
                    id: 38, original: "Not gettin' angry, I'm stayin' hungry", modified: "Not gettin' angry, I'm stayin' horny", wordChanges: [ /* Copy exact structure from original test if needed */]
                },
                {
                    id: 39, original: "Not gettin' angry, still stayin' hungry", modified: "Not gettin' angry, still stayin' horny", wordChanges: [ /* Copy exact structure from original test if needed */]
                },
            ];


            handleReplaceAll('angry,', 'happy', setLyricsMock, setFormValuesMock); // Replace "angry,"
            const updatedLyrics = setLyricsMock.mock.calls[0][0](initialLyricsAfterFirstReplace);

            const expectedStates: ExpectedLineState[] = [
                // Lines 36, 37 remain unchanged from the previous step
                { id: 36, modified: "I'm stayin' horny, I'm stayin' horny", markedText: `I'm stayin' <span class="text-red-600">horny</span>, I'm stayin' <span class="text-red-600">horny</span>`, wordCount: 2 },
                { id: 37, modified: "I'm stayin' horny, I'm stayin' horny", markedText: `I'm stayin' <span class="text-red-600">horny</span>, I'm stayin' <span class="text-red-600">horny</span>`, wordCount: 2 },
                // Lines 38, 39 now have "happy" instead of "angry", and "horny" remains marked
                { id: 38, modified: "Not gettin' happy, I'm stayin' horny", markedText: `Not gettin' <span class="text-red-600">happy</span>, I'm stayin' <span class="text-red-600">horny</span>`, wordCount: 2 },
                { id: 39, modified: "Not gettin' happy, still stayin' horny", markedText: `Not gettin' <span class="text-red-600">happy</span>, still stayin' <span class="text-red-600">horny</span>`, wordCount: 2 },
            ];

            // Total count increases because 'angry' -> 'happy' is another change from original
            assertReplaceAllResult(updatedLyrics, expectedStates, 8);
        });

        it('should apply a third replacement ("horny," -> "hungry"), partially reverting changes', () => {
            // Define the state AFTER the first two replacements
            const initialLyricsAfterSecondReplace: LyricLine[] = [
                {
                    id: 36, original: "I'm stayin' hungry, I'm stayin' hungry", modified: "I'm stayin' horny, I'm stayin' horny", wordChanges: [ /* Copy exact structure from original test if needed */]
                },
                {
                    id: 37, original: "I'm stayin' hungry, I'm stayin' hungry", modified: "I'm stayin' horny, I'm stayin' horny", wordChanges: [ /* Copy exact structure from original test if needed */]
                },
                {
                    id: 38, original: "Not gettin' angry, I'm stayin' hungry", modified: "Not gettin' happy, I'm stayin' horny", wordChanges: [ /* Copy exact structure from original test if needed */]
                },
                {
                    id: 39, original: "Not gettin' angry, still stayin' hungry", modified: "Not gettin' happy, still stayin' horny", wordChanges: [ /* Copy exact structure from original test if needed */]
                },
            ];


            handleReplaceAll('horny,', 'hungry', setLyricsMock, setFormValuesMock); // Replacing 'horny,' (finds 'horny')
            const updatedLyrics = setLyricsMock.mock.calls[0][0](initialLyricsAfterSecondReplace);

            const expectedStates: ExpectedLineState[] = [
                // Lines 36, 37: 'horny' reverts to 'hungry', matching original, count becomes 0
                { id: 36, modified: "I'm stayin' hungry, I'm stayin' hungry", markedText: `I'm stayin' hungry, I'm stayin' hungry`, wordCount: 0 },
                { id: 37, modified: "I'm stayin' hungry, I'm stayin' hungry", markedText: `I'm stayin' hungry, I'm stayin' hungry`, wordCount: 0 },
                // Lines 38, 39: 'horny' reverts to 'hungry'. Diff from original is now only 'angry' -> 'happy'. Count becomes 1.
                { id: 38, modified: "Not gettin' happy, I'm stayin' hungry", markedText: `Not gettin' <span class="text-red-600">happy</span>, I'm stayin' hungry`, wordCount: 1 },
                { id: 39, modified: "Not gettin' happy, still stayin' hungry", markedText: `Not gettin' <span class="text-red-600">happy</span>, still stayin' hungry`, wordCount: 1 },
            ];

            // Total count decreases as lines 36/37 revert fully, lines 38/39 revert partially
            assertReplaceAllResult(updatedLyrics, expectedStates, 2);
        });

    });
    describe('handleReplaceAll Robust Tests', () => {
        let setLyricsMock: jest.Mock;
        let setFormValuesMock: jest.Mock;
        let currentFormValuesState: FormValues;

        // Define ExpectedLineState here so it's accessible
        interface ExpectedLineState {
            id: number;
            modified: string;
            markedText: string;
            wordCount: number;
        }

        beforeEach(() => {
            setLyricsMock = jest.fn();
            setFormValuesMock = jest.fn();
            currentFormValuesState = { songUrl: '', lyrics: '' }; // Reset form state between tests
        });

        // Assertion Helper Function - No changes needed here
        function assertReplaceAllResult(
            updatedLyrics: LyricLine[],
            stepSpecificExpectedStates: ExpectedLineState[],
            expectedTotalCount: number,
            finalFormValues: FormValues
        ) {
            // Check specific lines modified in this step
            for (const expected of stepSpecificExpectedStates) {
                const actualLine = updatedLyrics.find(line => line.id === expected.id);
                // Add context to find failure
                if (!actualLine) {
                    throw new Error(`Assertion failed: Line ID ${expected.id} not found in updatedLyrics`);
                }
                // expect(actualLine).toBeDefined(); // Already handled by throw
                // if (!actualLine) continue; // Unreachable if throw is used

                expect(actualLine.modified).toBe(expected.modified);
                expect(actualLine.markedText).toBe(expected.markedText);
                expect(countChangedWords(actualLine)).toBe(expected.wordCount);
            }

            const actualTotalCount = updatedLyrics.reduce((sum, line) => sum + countChangedWords(line), 0);
            expect(actualTotalCount).toBe(expectedTotalCount);
            expect(setFormValuesMock).toHaveBeenCalledTimes(1);
            const fullExpectedLyrics = updatedLyrics.map(line => line.modified).join('\n');
            expect(finalFormValues.lyrics).toBe(fullExpectedLyrics);
        }


        // --- English Scenarios ---
        describe('English Lyrics', () => {
            const englishRaw = `I take it easy, babe, I
I get down, it's automatic, uh
I've come to believin' that
That too much time is evil
I transition in
I'm making your body wait
Like on an aeroplane
Please, baby, take me away, yeah
I want your time (time, time)
Don't ask me questions (questions, questions)
That you don't want (want, want)
The answers to (to, to)
I know
I know
I know
I know
I kinda miss the nine to five, yeah
Do not think that you can hide
I scramble, fight just like a child
Hey, nah, nah, nah, nah, nah, nah, nah, nah
I'm stayin' hungry, I'm stayin' hungry
I'm stayin' hungry, I'm stayin' hungry
Not gettin' angry, I'm stayin' hungry
Not gettin' angry, still stayin' hungry
Yeah
(Hold on, hold on, hold)
(The click was always in you Fab)
(It was never on)
(It was never on)`;
            let currentLyricsState: LyricLine[] = generateLyricsData(englishRaw);

            it('Step 1: Replace "hungry" with "thirsty"', () => {
                const previousLyricsState = JSON.parse(JSON.stringify(currentLyricsState));
                setLyricsMock.mockImplementation((updater) => {
                    currentLyricsState = updater(previousLyricsState);
                });
                setFormValuesMock.mockImplementation((updater) => {
                    currentFormValuesState = updater(currentFormValuesState);
                });

                handleReplaceAll('hungry', 'thirsty', setLyricsMock, setFormValuesMock);

                const stepSpecificExpectedStates: ExpectedLineState[] = [
                    { id: 21, modified: "I'm stayin' thirsty, I'm stayin' thirsty", markedText: `I'm stayin' <span class="text-red-600">thirsty</span>, I'm stayin' <span class="text-red-600">thirsty</span>`, wordCount: 2 },
                    { id: 22, modified: "I'm stayin' thirsty, I'm stayin' thirsty", markedText: `I'm stayin' <span class="text-red-600">thirsty</span>, I'm stayin' <span class="text-red-600">thirsty</span>`, wordCount: 2 },
                    { id: 23, modified: "Not gettin' angry, I'm stayin' thirsty", markedText: `Not gettin' angry, I'm stayin' <span class="text-red-600">thirsty</span>`, wordCount: 1 },
                    { id: 24, modified: "Not gettin' angry, still stayin' thirsty", markedText: `Not gettin' angry, still stayin' <span class="text-red-600">thirsty</span>`, wordCount: 1 },
                ];
                assertReplaceAllResult(currentLyricsState, stepSpecificExpectedStates, 6, currentFormValuesState);
            });

            it('Step 2: Replace "angry," with "calm" (cumulative, punctuation handling)', () => {
                const previousLyricsState = JSON.parse(JSON.stringify(currentLyricsState));
                setLyricsMock.mockImplementation((updater) => {
                    currentLyricsState = updater(previousLyricsState);
                });
                setFormValuesMock.mockImplementation((updater) => {
                    currentFormValuesState = updater(currentFormValuesState);
                });

                handleReplaceAll('angry,', 'calm', setLyricsMock, setFormValuesMock);

                const stepSpecificExpectedStates: ExpectedLineState[] = [
                    { id: 23, modified: "Not gettin' calm, I'm stayin' thirsty", markedText: `Not gettin' <span class="text-red-600">calm</span>, I'm stayin' <span class="text-red-600">thirsty</span>`, wordCount: 2 },
                    { id: 24, modified: "Not gettin' calm, still stayin' thirsty", markedText: `Not gettin' <span class="text-red-600">calm</span>, still stayin' <span class="text-red-600">thirsty</span>`, wordCount: 2 },
                ];
                assertReplaceAllResult(currentLyricsState, stepSpecificExpectedStates, 8, currentFormValuesState);
            });

            it('Step 3: Replace "nah" with "" (deletion, cumulative)', () => {
                const previousLyricsState = JSON.parse(JSON.stringify(currentLyricsState));

                setLyricsMock.mockImplementation((updater) => {
                    currentLyricsState = updater(previousLyricsState);
                });
                setFormValuesMock.mockImplementation((updater) => {
                    currentFormValuesState = updater(currentFormValuesState);
                });

                handleReplaceAll('nah', '', setLyricsMock, setFormValuesMock);

                // Adjusted expected text - might need trim depending on implementation
                const expectedModifiedL21 = "Hey, , , , , , , ,";
                const expectedMarkedL21 = `Hey, <span class=\"text-red-600\">🗙</span>, <span class=\"text-red-600\">🗙</span>, <span class=\"text-red-600\">🗙</span>, <span class=\"text-red-600\">🗙</span>, <span class=\"text-red-600\">🗙</span>, <span class=\"text-red-600\">🗙</span>, <span class=\"text-red-600\">🗙</span>, <span class=\"text-red-600\">🗙</span>`;

                const stepSpecificExpectedStates: ExpectedLineState[] = [
                    { id: 20, modified: expectedModifiedL21, markedText: expectedMarkedL21, wordCount: 8 },
                ];
                assertReplaceAllResult(currentLyricsState, stepSpecificExpectedStates, 16, currentFormValuesState);
            });

            it('Step 4: Replace "time" with "moment" (cumulative, appears multiple times/contexts)', () => {
                const previousLyricsState = JSON.parse(JSON.stringify(currentLyricsState));

                setLyricsMock.mockImplementation((updater) => {
                    currentLyricsState = updater(previousLyricsState);
                });
                setFormValuesMock.mockImplementation((updater) => {
                    currentFormValuesState = updater(currentFormValuesState);
                });

                handleReplaceAll('time', 'moment', setLyricsMock, setFormValuesMock);

                // Assuming generateMarkedText is fixed/should handle parentheses
                const expectedMarkedTextL9 = `I want your <span class="text-red-600">moment</span> (<span class="text-red-600">moment</span>, <span class="text-red-600">moment</span>)`;

                const stepSpecificExpectedStates: ExpectedLineState[] = [
                    { id: 4, modified: "That too much moment is evil", markedText: `That too much <span class="text-red-600">moment</span> is evil`, wordCount: 1 },
                    { id: 9, modified: "I want your moment (moment, moment)", markedText: expectedMarkedTextL9, wordCount: 3 },
                ];
                assertReplaceAllResult(currentLyricsState, stepSpecificExpectedStates, 20, currentFormValuesState);
            });

            // it('Step 5: Replace substring with brackets, angle brackets, comma, and exclamation', () => {
            //     // Raw lyric that includes special punctuation
            //     const englishSpecialRaw = "Hello (World), welcome to <Amazing> day!";
            //     let englishLyricsState: LyricLine[] = generateLyricsData(englishSpecialRaw);
            //     currentFormValuesState = { songUrl: '', lyrics: '' }; // Reset form state

            //     // Prepare the mock update functions
            //     const previousLyricsState = JSON.parse(JSON.stringify(englishLyricsState));
            //     setLyricsMock.mockImplementation(updater => {
            //         englishLyricsState = updater(previousLyricsState);
            //     });
            //     setFormValuesMock.mockImplementation(updater => {
            //         currentFormValuesState = updater(currentFormValuesState);
            //     });

            //     // Replace "(World)," with "(Universe),"
            //     // This search string contains a left bracket, right bracket, and a comma.
            //     handleReplaceAll('(World),', '(Universe),', setLyricsMock, setFormValuesMock);

            //     // Define expected result for the line:
            //     // - The modified text should show the replaced substring.
            //     // - The marked text should wrap the new substring in a red span.
            //     // - The word count (number of replacements) should be 1.
            //     const expectedEnglish: ExpectedLineState = {
            //         id: 1,
            //         modified: "Hello (Universe), welcome to <Amazing> day!",
            //         markedText: "Hello <span class=\"text-red-600\">(Universe)</span>, welcome to <Amazing> day!",
            //         wordCount: 1
            //     };

            //     // Verify the results
            //     assertReplaceAllResult(englishLyricsState, [expectedEnglish], 1, currentFormValuesState);
            // });
        });

        // --- Chinese Scenarios ---
        describe('Chinese Lyrics', () => {
            const chineseRaw = `我种下一颗种子 终于长出了果实
今天是个伟大日子
摘下星星送给你 拽下月亮送给你
让太阳每天为你升起
变成蜡烛燃烧自己 只为照亮你
把我一切都献给你 只要你欢喜
你让我每个明天都变得有意义
生命虽短爱你永远 不离不弃
你是我的小呀小苹果儿 怎么爱你都不嫌多
红红的小脸儿温暖我的心窝 点亮我生命的火 火火火火
你是我的小呀小苹果儿 就像天边最美的云朵
春天又来到了花开满山坡 种下希望就会收获
从不觉得你讨厌 你的一切都喜欢
有你的每天都新鲜
有你阳光更灿烂 有你黑夜不黑暗
你是白云我是蓝天
春天和你漫步在盛开的 花丛间
夏天夜晚陪你一起看 星星眨眼
秋天黄昏与你徜徉在 金色麦田
冬天雪花飞舞有你 更加温暖`;
            let currentLyricsState: LyricLine[] = generateLyricsData(chineseRaw);

            it('Step 1: Replace "种子" (seed) with "幼苗" (seedling)', () => {
                const previousLyricsState = JSON.parse(JSON.stringify(currentLyricsState));
                setLyricsMock.mockImplementation(updater => { currentLyricsState = updater(previousLyricsState); });
                setFormValuesMock.mockImplementation(updater => { currentFormValuesState = updater(currentFormValuesState); });

                handleReplaceAll('种子', '幼苗', setLyricsMock, setFormValuesMock);

                const stepSpecificExpectedStates: ExpectedLineState[] = [
                    { id: 1, modified: "我种下一颗幼苗 终于长出了果实", markedText: `我种下一颗<span class="text-red-600">幼苗</span> 终于长出了果实`, wordCount: 2 },
                ];
                assertReplaceAllResult(currentLyricsState, stepSpecificExpectedStates, 2, currentFormValuesState);
            });

            it('Step 2: Replace "你" (you) with "他" (him/her) - cumulative', () => {
                const previousLyricsState = JSON.parse(JSON.stringify(currentLyricsState));
                setLyricsMock.mockImplementation(updater => { currentLyricsState = updater(previousLyricsState); });
                setFormValuesMock.mockImplementation(updater => { currentFormValuesState = updater(currentFormValuesState); });

                handleReplaceAll('你', '他', setLyricsMock, setFormValuesMock);

                const stepSpecificExpectedStates: ExpectedLineState[] = [
                    { id: 3, modified: "摘下星星送给他 拽下月亮送给他", markedText: `摘下星星送给<span class="text-red-600">他</span> 拽下月亮送给<span class="text-red-600">他</span>`, wordCount: 2 },
                    { id: 4, modified: "让太阳每天为他升起", markedText: `让太阳每天为<span class="text-red-600">他</span>升起`, wordCount: 1 },
                    { id: 5, modified: "变成蜡烛燃烧自己 只为照亮他", markedText: `变成蜡烛燃烧自己 只为照亮<span class="text-red-600">他</span>`, wordCount: 1 },
                    { id: 6, modified: "把我一切都献给他 只要他欢喜", markedText: `把我一切都献给<span class="text-red-600">他</span> 只要<span class="text-red-600">他</span>欢喜`, wordCount: 2 },
                    { id: 7, modified: "他让我每个明天都变得有意义", markedText: `<span class="text-red-600">他</span>让我每个明天都变得有意义`, wordCount: 1 },
                    { id: 8, modified: "生命虽短爱他永远 不离不弃", markedText: `生命虽短爱<span class="text-red-600">他</span>永远 不离不弃`, wordCount: 1 },
                    { id: 9, modified: "他是我的小呀小苹果儿 怎么爱他都不嫌多", markedText: `<span class="text-red-600">他</span>是我的小呀小苹果儿 怎么爱<span class="text-red-600">他</span>都不嫌多`, wordCount: 2 },
                    { id: 11, modified: "他是我的小呀小苹果儿 就像天边最美的云朵", markedText: `<span class="text-red-600">他</span>是我的小呀小苹果儿 就像天边最美的云朵`, wordCount: 1 },
                    { id: 13, modified: "从不觉得他讨厌 他的一切都喜欢", markedText: `从不觉得<span class="text-red-600">他</span>讨厌 <span class="text-red-600">他</span>的一切都喜欢`, wordCount: 2 },
                    { id: 14, modified: "有他的每天都新鲜", markedText: `有<span class="text-red-600">他</span>的每天都新鲜`, wordCount: 1 },
                    { id: 15, modified: "有他阳光更灿烂 有他黑夜不黑暗", markedText: `有<span class="text-red-600">他</span>阳光更灿烂 有<span class="text-red-600">他</span>黑夜不黑暗`, wordCount: 2 },
                    { id: 16, modified: "他是白云我是蓝天", markedText: `<span class="text-red-600">他</span>是白云我是蓝天`, wordCount: 1 },
                    { id: 17, modified: "春天和他漫步在盛开的 花丛间", markedText: `春天和<span class="text-red-600">他</span>漫步在盛开的 花丛间`, wordCount: 1 },
                    { id: 18, modified: "夏天夜晚陪他一起看 星星眨眼", markedText: `夏天夜晚陪<span class="text-red-600">他</span>一起看 星星眨眼`, wordCount: 1 },
                    { id: 19, modified: "秋天黄昏与他徜徉在 金色麦田", markedText: `秋天黄昏与<span class="text-red-600">他</span>徜徉在 金色麦田`, wordCount: 1 },
                    { id: 20, modified: "冬天雪花飞舞有他 更加温暖", markedText: `冬天雪花飞舞有<span class="text-red-600">他</span> 更加温暖`, wordCount: 1 },
                ];
                assertReplaceAllResult(currentLyricsState, stepSpecificExpectedStates, 23, currentFormValuesState);
            });

            it('Step 3: Replace "温暖" (warm) with "" (deletion, cumulative)', () => {
                const previousLyricsState = JSON.parse(JSON.stringify(currentLyricsState));
                setLyricsMock.mockImplementation(updater => { currentLyricsState = updater(previousLyricsState); });
                setFormValuesMock.mockImplementation(updater => { currentFormValuesState = updater(currentFormValuesState); });

                handleReplaceAll('温暖', '', setLyricsMock, setFormValuesMock);

                const stepSpecificExpectedStates: ExpectedLineState[] = [
                    { id: 10, modified: "红红的小脸儿我的心窝 点亮我生命的火 火火火火", markedText: "红红的小脸儿我的心窝 点亮我生命的火 火火火火", wordCount: 2 },
                    { id: 20, modified: "冬天雪花飞舞有他 更加", markedText: "冬天雪花飞舞有<span class=\"text-red-600\">他</span> 更加", wordCount: 3 },
                ];
                assertReplaceAllResult(currentLyricsState, stepSpecificExpectedStates, 27, currentFormValuesState);
            });

            // it('Step 4: Replace substring with brackets, angle brackets, comma, and exclamation', () => {
            //     // Raw lyric in Chinese with similar special punctuation
            //     const chineseSpecialRaw = "你好 (世界)，欢迎来到 <精彩> 的日子!";
            //     let chineseLyricsState: LyricLine[] = generateLyricsData(chineseSpecialRaw);
            //     currentFormValuesState = { songUrl: '', lyrics: '' }; // Reset form state

            //     // Prepare the mock update functions
            //     const previousLyricsState = JSON.parse(JSON.stringify(chineseLyricsState));
            //     setLyricsMock.mockImplementation(updater => {
            //         chineseLyricsState = updater(previousLyricsState);
            //     });
            //     setFormValuesMock.mockImplementation(updater => {
            //         currentFormValuesState = updater(currentFormValuesState);
            //     });

            //     // Replace "(世界)，" with "(宇宙)，"
            //     handleReplaceAll('(世界),', '(宇宙),', setLyricsMock, setFormValuesMock);

            //     // Define expected result for the line:
            //     // - The modified text should show the replacement.
            //     // - The marked text should wrap the new substring in the red span.
            //     // - wordCount should be 1
            //     const expectedChinese: ExpectedLineState = {
            //         id: 1,
            //         modified: "你好 (宇宙)，欢迎来到 <精彩> 的日子!",
            //         markedText: "你好 <span class=\"text-red-600\">(宇宙)</span>,欢迎来到 <精彩> 的日子!",
            //         wordCount: 1
            //     };

            //     // Verify the results
            //     assertReplaceAllResult(chineseLyricsState, [expectedChinese], 1, currentFormValuesState);
            // });
        });

        // --- Vietnamese Scenarios ---
        describe('Vietnamese Lyrics', () => {
            const vietnameseRaw = `Một năm tuyệt vời đã qua
Người người lại cùng đón xuân đang về
Mùa xuân năm nay, quần quanh bên nhau
Kể cho nhau nghe bao buồn vui

Rồi mọi người cùng chúc nhau
Tài lộc đầy nhà cháu con xum vầy
Cầu mong yên vui, vận may luôn theo
Toàn gia ngập tràn hạnh phúc

Đào mai đua nhau nở sắc màu sáng tươi
Từng đàn chim tung cánh vui hót hân hoan vang trời
Cầu mong yên vui sẽ cho nhân gian nụ cười

Trẻ em khoe áo mới đón mùa tết vui
Mẹ lay hoay trong bếp đóng gói bánh trưng gia đình
Hồi hợp đợi chờ giữa khuya mừng giao thừa tới

Tết đến rồi chúc nhau yên vui 1 năm
Tài lộc đầy nhà cháu con long phụng xum vầy
Tết đến rồi chúc nhau an khang phồn vinh
Thành đạt thật nhiều ước mơ sẽ bay thật xa…`;
            let currentLyricsState: LyricLine[] = generateLyricsData(vietnameseRaw);

            it('Step 1: Replace "xuân" (spring) with "hè" (summer)', () => {
                const previousLyricsState = JSON.parse(JSON.stringify(currentLyricsState));
                setLyricsMock.mockImplementation(updater => { currentLyricsState = updater(previousLyricsState); });
                setFormValuesMock.mockImplementation(updater => { currentFormValuesState = updater(currentFormValuesState); });

                handleReplaceAll('xuân', 'hè', setLyricsMock, setFormValuesMock);

                const stepSpecificExpectedStates: ExpectedLineState[] = [
                    { id: 2, modified: "Người người lại cùng đón hè đang về", markedText: `Người người lại cùng đón <span class="text-red-600">hè</span> đang về`, wordCount: 1 },
                    { id: 3, modified: "Mùa hè năm nay, quần quanh bên nhau", markedText: `Mùa <span class="text-red-600">hè</span> năm nay, quần quanh bên nhau`, wordCount: 1 },
                ];
                assertReplaceAllResult(currentLyricsState, stepSpecificExpectedStates, 2, currentFormValuesState);
            });

            it('Step 2: Replace "nhau" (each other) with "ta" (us) - cumulative', () => {
                const previousLyricsState = JSON.parse(JSON.stringify(currentLyricsState));
                setLyricsMock.mockImplementation(updater => { currentLyricsState = updater(previousLyricsState); });
                setFormValuesMock.mockImplementation(updater => { currentFormValuesState = updater(currentFormValuesState); });

                handleReplaceAll('nhau', 'ta', setLyricsMock, setFormValuesMock);

                const stepSpecificExpectedStates: ExpectedLineState[] = [
                    { id: 3, modified: "Mùa hè năm nay, quần quanh bên ta", markedText: `Mùa <span class="text-red-600">hè</span> năm nay, quần quanh bên <span class="text-red-600">ta</span>`, wordCount: 2 },
                    { id: 4, modified: "Kể cho ta nghe bao buồn vui", markedText: `Kể cho <span class="text-red-600">ta</span> nghe bao buồn vui`, wordCount: 1 },
                    { id: 5, modified: "Rồi mọi người cùng chúc ta", markedText: `Rồi mọi người cùng chúc <span class="text-red-600">ta</span>`, wordCount: 1 },
                    { id: 9, modified: "Đào mai đua ta nở sắc màu sáng tươi", markedText: `Đào mai đua <span class="text-red-600">ta</span> nở sắc màu sáng tươi`, wordCount: 1 },
                    { id: 15, modified: "Tết đến rồi chúc ta yên vui 1 năm", markedText: `Tết đến rồi chúc <span class="text-red-600">ta</span> yên vui 1 năm`, wordCount: 1 },
                    { id: 17, modified: "Tết đến rồi chúc ta an khang phồn vinh", markedText: `Tết đến rồi chúc <span class="text-red-600">ta</span> an khang phồn vinh`, wordCount: 1 },
                ];
                assertReplaceAllResult(currentLyricsState, stepSpecificExpectedStates, 8, currentFormValuesState);
            });

            it('Step 3: Replace "vui" (happy/fun) with "" (deletion, cumulative)', () => {
                const previousLyricsState = JSON.parse(JSON.stringify(currentLyricsState));
                setLyricsMock.mockImplementation(updater => { currentLyricsState = updater(previousLyricsState); });
                setFormValuesMock.mockImplementation(updater => { currentFormValuesState = updater(currentFormValuesState); });
                handleReplaceAll('vui', '', setLyricsMock, setFormValuesMock);
                const stepSpecificExpectedStates: ExpectedLineState[] = [
                    { id: 4, modified: "Kể cho ta nghe bao buồn", markedText: "Kể cho <span class=\"text-red-600\">ta</span> nghe bao buồn <span class=\"text-red-600\">🗙</span>", wordCount: 2 },
                    { id: 7, modified: "Cầu mong yên , vận may luôn theo", markedText: "Cầu mong yên <span class=\"text-red-600\">🗙</span>, vận may luôn theo", wordCount: 1 },
                    { id: 10, modified: "Từng đàn chim tung cánh hót hân hoan vang trời", markedText: "Từng đàn chim tung cánh <span class=\"text-red-600\">🗙</span> hót hân hoan vang trời", wordCount: 1 },
                    { id: 11, modified: "Cầu mong yên sẽ cho nhân gian nụ cười", markedText: "Cầu mong yên <span class=\"text-red-600\">🗙</span> sẽ cho nhân gian nụ cười", wordCount: 1 },
                    { id: 12, modified: "Trẻ em khoe áo mới đón mùa tết", markedText: "Trẻ em khoe áo mới đón mùa tết <span class=\"text-red-600\">🗙</span>", wordCount: 1 },
                    { id: 15, modified: "Tết đến rồi chúc ta yên 1 năm", markedText: "Tết đến rồi chúc <span class=\"text-red-600\">ta</span> yên <span class=\"text-red-600\">🗙</span> 1 năm", wordCount: 2 },
                ];
                assertReplaceAllResult(currentLyricsState, stepSpecificExpectedStates, 14, currentFormValuesState);
            });
        });
    });
});
/* The reader's print sheet, drawn on paper (job 09-legacy-and-print, round 01). It builds the printed flow of a native
   chapter from the signed reader's data (reader.js, copied unchanged) plus the wave-2 samples the handoff names, each
   copied as data from its signed round: the quiz items (04-quiz), the figure row and the sources block (02-figures).
   The diagram is drawn on paper from placed HTML elements in the signed print tones (03-diagrams). Canvas data and
   layout helpers only; the product prints the same blocks with its own stylesheet (build-prompt.md, Print). */
(function () {
  "use strict";
  var RD = window.RD, LG = window.LG;
  var DATA = {"quiz":{"en2":{"at":49,"title":"Check what stuck","items":[{"id":"read-column","type":"choice","n":1,"explain":[{"v":"Reindex rebuilds every row from the files on disk, so a column with no file-derived source is silently wiped on the next boot. This is the same trap the version-history design had to avoid: bodies live in "},{"v":".versions/","f":"c"},{"v":" files and the table is derived from them. Durable-but-not-file-derived data belongs in the Postgres accounts plane instead."}],"multi":false,"answer":["b"],"prompt":[{"v":"You are adding a feature that records who last read each document. Storing it as a new column on the SQLite "},{"v":"documents","f":"c"},{"v":" table is a bad idea. Why?"}],"options":[{"id":"a","key":"A","runs":[{"v":"SQLite cannot add columns to an existing table without a full rebuild"}]},{"id":"b","key":"B","runs":[{"v":"The content database is a projection of the files — anything not re-derivable from disk is lost on the next reindex"}]},{"id":"c","key":"C","runs":[{"v":"The FTS5 trigger trio would need updating, which is a breaking change"}]},{"id":"d","key":"D","runs":[{"v":"Read tracking belongs to the usage plane, which forbids new columns"}]}]},{"id":"publish-in-lock","type":"choice","n":2,"explain":[{"v":"The push task takes "},{"v":"WRITE_LOCK","f":"c"},{"v":" itself because a rebase mutates the working tree, and "},{"v":"threading.Lock","f":"c"},{"v":" is not reentrant. Submitting is only a queue append and never blocks — the deadlock happens later, on the worker thread, which is what makes it an easy mistake to ship."}],"multi":false,"answer":["c"],"prompt":[{"v":"A publish task must be submitted from outside the write lock. What goes wrong if you submit while holding it?"}],"options":[{"id":"a","key":"A","runs":[{"v":"The task runs before the response, reintroducing the timeout bug"}]},{"id":"b","key":"B","runs":[{"v":"The queue rejects the submission and the push is silently dropped"}]},{"id":"c","key":"C","runs":[{"v":"The task re-takes the same non-reentrant lock, so it deadlocks as soon as the worker runs it"}]},{"id":"d","key":"D","runs":[{"v":"Two workers start, and concurrent rebases corrupt the working tree"}]}]},{"id":"two-planes","type":"choice","n":3,"explain":[{"v":"Slugs and keys must survive a reindex, so they live in Postgres. A body is a file, and the search index is rebuilt from the files."}],"multi":true,"answer":["a","c"],"prompt":[{"v":"Which of these live in the "},{"v":"accounts plane","f":"l","to":"#the-two-planes"},{"v":", not in the content plane?"}],"options":[{"id":"a","key":"A","runs":[{"v":"The org's slug"}]},{"id":"b","key":"B","runs":[{"v":"A document's body"}]},{"id":"c","key":"C","runs":[{"v":"API keys"}]},{"id":"d","key":"D","runs":[{"v":"The full-text search index"}]}]},{"id":"rel-path","type":"choice","n":4,"explain":[{"v":"Identity is immutable across a version chain, and the 422 says so explicitly (“publish it as a new document instead”). The reason is structural: "},{"v":"rel_path","f":"c"},{"v":" encodes both the project directory and the file extension, and the archive directory sits beside it — so a format change is not the same document by any definition the storage layer recognizes."}],"multi":false,"answer":["b"],"prompt":[{"v":"An agent re-publishes a markdown document as HTML, passing the existing document's "},{"v":"rel_path","f":"c"},{"v":" as the version target. What does the API do?"}],"options":[{"id":"a","key":"A","runs":[{"v":"Archives the old body and writes the HTML at the same path, changing the extension"}]},{"id":"b","key":"B","runs":[{"v":"Answers 422 — a version chain cannot change a document's format or project"}]},{"id":"c","key":"C","runs":[{"v":"Silently creates a second document and returns 201 with a new id"}]},{"id":"d","key":"D","runs":[{"v":"Answers 409, since a document already exists at that path"}]},{"id":"e","key":"E","runs":[{"v":"Converts the HTML to extracted text and stores it as markdown"}]}]},{"id":"projection","type":"recall","n":5,"explain":[{"v":"That is why durable data that no file holds, such as who read what, lives in the Postgres accounts plane."}],"prompt":[{"v":"In one sentence: why is the content database called a "},{"v":"projection","f":"e"},{"v":"?"}],"answerRuns":[{"v":"Every row is derived from the files on disk, so "},{"v":"reindex","f":"c"},{"v":" can rebuild it at any time; nothing in it is the source of truth."}]},{"id":"write-path","type":"cloze","n":6,"explain":[{"v":"The push to the remote comes later, on the "},{"v":"publish worker","f":"l","to":"#the-publish-worker"},{"v":", which is why the API can answer before it."}],"segs":[{"runs":[{"v":"A write takes the "}]},{"blank":1,"accepted":["write lock","WRITE_LOCK"],"tail":","},{"runs":[{"v":" saves the file, updates the "}]},{"blank":2,"accepted":["SQLite"],"tail":""},{"runs":[{"v":" index and commits to "}]},{"blank":3,"accepted":["git"],"tail":"."},{"runs":[{"v":" Org slugs and API keys live elsewhere, in "}]},{"blank":4,"accepted":["PostgreSQL","Postgres"],"tail":"."}]},{"id":"dormant","type":"choice","n":7,"explain":[{"v":"The accounts plane is a lazy singleton: unset "},{"v":"DATABASE_URL","f":"c"},{"v":" means no engine is ever created and the content plane behaves byte-for-byte like the pre-multi-tenant deployment, gated by a legacy regression suite. This dormancy is what makes the open-core scaffold possible — a self-hoster runs the same code as the SaaS with one variable unset."}],"multi":false,"answer":["c"],"prompt":[{"v":"An operator sets "},{"v":"DATABASE_URL","f":"c"},{"v":" to nothing and restarts. What happens?"}],"options":[{"id":"a","key":"A","runs":[{"v":"The process fails to boot, since the accounts tables are required"}]},{"id":"b","key":"B","runs":[{"v":"It boots but every "},{"v":"/api/*","f":"c"},{"v":" request answers 401 with no way to authenticate"}]},{"id":"c","key":"C","runs":[{"v":"The accounts engine is never created and "},{"v":"/api/*","f":"c"},{"v":" behaves as the single-tenant, single-token deployment"}]},{"id":"d","key":"D","runs":[{"v":"The content plane switches to Postgres and SQLite is retired"}]}]}]},"en1":{"at":49,"title":"Check what stuck","items":[{"id":"read-column","type":"choice","n":1,"explain":[{"v":"Reindex rebuilds every row from the files on disk, so a column with no file-derived source is silently wiped on the next boot. This is the same trap the version-history design had to avoid: bodies live in "},{"v":".versions/","f":"c"},{"v":" files and the table is derived from them. Durable-but-not-file-derived data belongs in the Postgres accounts plane instead."}],"multi":false,"answer":["b"],"prompt":[{"v":"You are adding a feature that records who last read each document. Storing it as a new column on the SQLite "},{"v":"documents","f":"c"},{"v":" table is a bad idea. Why?"}],"options":[{"id":"a","key":"A","runs":[{"v":"SQLite cannot add columns to an existing table without a full rebuild"}]},{"id":"b","key":"B","runs":[{"v":"The content database is a projection of the files — anything not re-derivable from disk is lost on the next reindex"}]},{"id":"c","key":"C","runs":[{"v":"The FTS5 trigger trio would need updating, which is a breaking change"}]},{"id":"d","key":"D","runs":[{"v":"Read tracking belongs to the usage plane, which forbids new columns"}]}]},{"id":"publish-in-lock","type":"choice","n":2,"explain":[{"v":"The push task takes "},{"v":"WRITE_LOCK","f":"c"},{"v":" itself because a rebase mutates the working tree, and "},{"v":"threading.Lock","f":"c"},{"v":" is not reentrant. Submitting is only a queue append and never blocks — the deadlock happens later, on the worker thread, which is what makes it an easy mistake to ship."}],"multi":false,"answer":["c"],"prompt":[{"v":"A publish task must be submitted from outside the write lock. What goes wrong if you submit while holding it?"}],"options":[{"id":"a","key":"A","runs":[{"v":"The task runs before the response, reintroducing the timeout bug"}]},{"id":"b","key":"B","runs":[{"v":"The queue rejects the submission and the push is silently dropped"}]},{"id":"c","key":"C","runs":[{"v":"The task re-takes the same non-reentrant lock, so it deadlocks as soon as the worker runs it"}]},{"id":"d","key":"D","runs":[{"v":"Two workers start, and concurrent rebases corrupt the working tree"}]}]},{"id":"rel-path","type":"choice","n":3,"explain":[{"v":"Identity is immutable across a version chain, and the 422 says so explicitly (“publish it as a new document instead”). The reason is structural: "},{"v":"rel_path","f":"c"},{"v":" encodes both the project directory and the file extension, and the archive directory sits beside it — so a format change is not the same document by any definition the storage layer recognizes."}],"multi":false,"answer":["b"],"prompt":[{"v":"An agent re-publishes a markdown document as HTML, passing the existing document's "},{"v":"rel_path","f":"c"},{"v":" as the version target. What does the API do?"}],"options":[{"id":"a","key":"A","runs":[{"v":"Archives the old body and writes the HTML at the same path, changing the extension"}]},{"id":"b","key":"B","runs":[{"v":"Answers 422 — a version chain cannot change a document's format or project"}]},{"id":"c","key":"C","runs":[{"v":"Silently creates a second document and returns 201 with a new id"}]},{"id":"d","key":"D","runs":[{"v":"Answers 409, since a document already exists at that path"}]}]},{"id":"projection","type":"recall","n":4,"explain":[{"v":"That is why durable data that no file holds, such as who read what, lives in the Postgres accounts plane."}],"prompt":[{"v":"In one sentence: why is the content database called a "},{"v":"projection","f":"e"},{"v":"?"}],"answerRuns":[{"v":"Every row is derived from the files on disk, so "},{"v":"reindex","f":"c"},{"v":" can rebuild it at any time; nothing in it is the source of truth."}]},{"id":"write-path","type":"cloze","n":5,"explain":[{"v":"The push to the remote comes later, on the "},{"v":"publish worker","f":"l","to":"#the-publish-worker"},{"v":", which is why the API can answer before it."}],"segs":[{"runs":[{"v":"A write takes the "}]},{"blank":1,"accepted":["write lock","WRITE_LOCK"],"tail":","},{"runs":[{"v":" saves the file, updates the "}]},{"blank":2,"accepted":["SQLite"],"tail":""},{"runs":[{"v":" index and commits to "}]},{"blank":3,"accepted":["git"],"tail":"."},{"runs":[{"v":" Org slugs and API keys live elsewhere, in "}]},{"blank":4,"accepted":["PostgreSQL","Postgres"],"tail":"."}]}]},"ko1":{"at":49,"title":"배운 것 확인하기","items":[{"id":"read-column","type":"choice","n":1,"explain":[{"v":"재색인은 디스크의 파일에서 모든 행을 다시 만들기 때문에, 파일에서 나오지 않는 열은 다음 부팅 때 조용히 지워집니다. 버전 기록 설계가 피해야 했던 것도 같은 함정입니다. 본문은 "},{"v":".versions/","f":"c"},{"v":" 파일에 있고 표는 그 파일에서 만들어집니다. 파일에서 나오지 않지만 오래 남아야 하는 데이터는 Postgres 계정 평면에 둡니다."}],"multi":false,"answer":["b"],"prompt":[{"v":"각 문서를 마지막으로 읽은 사람을 기록하는 기능을 추가하려고 합니다. 이를 SQLite "},{"v":"documents","f":"c"},{"v":" 테이블의 새 열로 저장하는 것은 나쁜 생각입니다. 왜일까요?"}],"options":[{"id":"a","key":"A","runs":[{"v":"SQLite는 테이블을 통째로 다시 만들지 않고는 기존 테이블에 열을 추가할 수 없다"}]},{"id":"b","key":"B","runs":[{"v":"콘텐츠 데이터베이스는 파일의 투영이다. 디스크에서 다시 만들 수 없는 것은 다음 재색인 때 사라진다"}]},{"id":"c","key":"C","runs":[{"v":"FTS5 트리거 세 개를 고쳐야 하고, 이는 호환을 깨는 변경이다"}]},{"id":"d","key":"D","runs":[{"v":"읽기 기록은 사용량 평면에 속하고, 그 평면은 새 열을 금지한다"}]}]},{"id":"publish-in-lock","type":"choice","n":2,"explain":[{"v":"푸시 작업은 리베이스가 작업 트리를 바꾸기 때문에 스스로 "},{"v":"WRITE_LOCK","f":"c"},{"v":"을 잡고, "},{"v":"threading.Lock","f":"c"},{"v":"은 재진입할 수 없습니다. 제출은 큐에 넣기만 하고 막히지 않으므로, 교착은 나중에 워커 스레드에서 일어납니다. 그래서 놓치기 쉬운 실수입니다."}],"multi":false,"answer":["c"],"prompt":[{"v":"발행 작업은 쓰기 잠금 밖에서 제출해야 합니다. 잠금을 쥔 채 제출하면 무엇이 잘못될까요?"}],"options":[{"id":"a","key":"A","runs":[{"v":"작업이 응답보다 먼저 실행되어 시간 초과 버그가 다시 생긴다"}]},{"id":"b","key":"B","runs":[{"v":"큐가 제출을 거부하고 푸시가 조용히 사라진다"}]},{"id":"c","key":"C","runs":[{"v":"작업이 재진입할 수 없는 같은 잠금을 다시 잡으려 해서, 워커가 실행하는 순간 교착 상태에 빠진다"}]},{"id":"d","key":"D","runs":[{"v":"워커 두 개가 시작되고, 동시에 일어난 리베이스가 작업 트리를 망가뜨린다"}]}]},{"id":"rel-path","type":"choice","n":3,"explain":[{"v":"버전 체인 동안 문서의 정체성은 바뀌지 않으며, 422 응답이 이를 분명히 말합니다(“새 문서로 발행하세요”). "},{"v":"rel_path","f":"c"},{"v":"에는 프로젝트 디렉터리와 파일 확장자가 함께 들어 있고 보관 디렉터리가 그 옆에 있으므로, 형식이 바뀌면 저장 계층이 아는 어떤 정의로도 같은 문서가 아닙니다."}],"multi":false,"answer":["b"],"prompt":[{"v":"에이전트가 마크다운 문서를 HTML로 다시 발행하면서, 기존 문서의 "},{"v":"rel_path","f":"c"},{"v":"를 버전 대상으로 넘깁니다. API는 어떻게 할까요?"}],"options":[{"id":"a","key":"A","runs":[{"v":"이전 본문을 보관하고, 확장자를 바꿔 같은 경로에 HTML을 쓴다"}]},{"id":"b","key":"B","runs":[{"v":"422로 답한다. 버전 체인은 문서의 형식이나 프로젝트를 바꿀 수 없다"}]},{"id":"c","key":"C","runs":[{"v":"조용히 두 번째 문서를 만들고 새 id와 함께 201을 돌려준다"}]},{"id":"d","key":"D","runs":[{"v":"그 경로에 이미 문서가 있으므로 409로 답한다"}]}]},{"id":"projection","type":"recall","n":4,"explain":[{"v":"그래서 누가 무엇을 읽었는지처럼 어떤 파일에도 없는 오래 남을 데이터는 Postgres 계정 평면에 둡니다."}],"prompt":[{"v":"한 문장으로: 콘텐츠 데이터베이스를 왜 "},{"v":"투영","f":"e"},{"v":"이라고 부를까요?"}],"answerRuns":[{"v":"모든 행이 디스크의 파일에서 나오므로 "},{"v":"reindex","f":"c"},{"v":"가 언제든 다시 만들 수 있고, 그 안의 어떤 것도 원본이 아니기 때문입니다."}]},{"id":"write-path","type":"cloze","n":5,"explain":[{"v":"원격 저장소로의 푸시는 나중에 발행 워커에서 일어납니다. 그래서 API가 푸시보다 먼저 답할 수 있습니다."}],"segs":[{"runs":[{"v":"쓰기는 "}]},{"blank":1,"accepted":["쓰기 잠금","WRITE_LOCK"],"tail":"을"},{"runs":[{"v":" 잡고, 파일을 저장하고, "}]},{"blank":2,"accepted":["SQLite"],"tail":""},{"runs":[{"v":" 색인을 갱신하고, "}]},{"blank":3,"accepted":["git"],"tail":"에"},{"runs":[{"v":" 커밋합니다. 조직 슬러그와 API 키는 다른 곳, "}]},{"blank":4,"accepted":["PostgreSQL","Postgres"],"tail":"에"},{"runs":[{"v":" 있습니다."}]}]}]},"twenty":{"at":-1,"title":"Twenty questions on the model","chapter":"The harmonic model in one sitting","items":[{"id":"sum-of-waves","type":"choice","n":1,"explain":[{"v":"Each constituent is a wave with its own period, amplitude and phase; a prediction is their sum."}],"multi":false,"answer":["b"],"prompt":[{"v":"Tidewater predicts a harbour's tide as one wave, or as many?"}],"options":[{"id":"a","key":"A","runs":[{"v":"One wave, scaled to the harbour"}]},{"id":"b","key":"B","runs":[{"v":"Many waves, added together"}]}]},{"id":"m2-period","type":"choice","n":2,"explain":[{"v":"M2 follows the moon, whose day is about 24 hours 50 minutes, so its two highs come 12.42 hours apart."}],"multi":false,"answer":["b"],"prompt":[{"v":"What is the period of M2, the principal lunar semidiurnal constituent?"}],"options":[{"id":"a","key":"A","runs":[{"v":"12.00 hours"}]},{"id":"b","key":"B","runs":[{"v":"12.42 hours"}]},{"id":"c","key":"C","runs":[{"v":"23.93 hours"}]},{"id":"d","key":"D","runs":[{"v":"24.84 hours"}]}]},{"id":"s2-period","type":"recall","n":3,"explain":[],"prompt":[{"v":"Which constituent has a period of exactly 12 hours, and why exactly?"}],"answerRuns":[{"v":"S2, the principal solar semidiurnal constituent: it follows the sun, and the solar day is 24 hours by definition."}]},{"id":"spring-tides","type":"choice","n":4,"explain":[{"v":"Spring tides have nothing to do with the season: at new and full moon the sun and the moon pull in line, so M2 and S2 add up. At the quarter moons they work against each other, and the tides are neap."}],"multi":false,"answer":["b"],"prompt":[{"v":"When do spring tides happen?"}],"options":[{"id":"a","key":"A","runs":[{"v":"In spring, from March to May"}]},{"id":"b","key":"B","runs":[{"v":"At new moon and full moon"}]},{"id":"c","key":"C","runs":[{"v":"At the quarter moons"}]},{"id":"d","key":"D","runs":[{"v":"When the moon is closest to the earth"}]},{"id":"e","key":"E","runs":[{"v":"Twice a year, at the equinoxes"}]},{"id":"f","key":"F","runs":[{"v":"Whenever M2 and K1 peak together"}]}]},{"id":"stored","type":"choice","n":5,"explain":[{"v":"Amplitude and phase are measured per harbour. A constituent's period is the same everywhere, so it lives in the code; the datum belongs to the harbour as a whole."}],"multi":true,"answer":["a","b"],"prompt":[{"v":"What does Tidewater store for each constituent at a harbour?"}],"options":[{"id":"a","key":"A","runs":[{"v":"An amplitude"}]},{"id":"b","key":"B","runs":[{"v":"A phase"}]},{"id":"c","key":"C","runs":[{"v":"A period"}]},{"id":"d","key":"D","runs":[{"v":"The harbour's datum"}]}]},{"id":"predict-a-minute","type":"cloze","n":6,"explain":[{"v":"Written out, h(t) = Z₀ + Σ A cos(ωt − φ), one term per constituent."}],"segs":[{"runs":[{"v":"To predict one minute, Tidewater takes each "}]},{"blank":1,"accepted":["constituent"],"tail":","},{"runs":[{"v":" works out its "}]},{"blank":2,"accepted":["phase","phase angle"],"tail":""},{"runs":[{"v":" at that minute from its "}]},{"blank":3,"accepted":["speed","angular speed"],"tail":","},{"runs":[{"v":" multiplies the cosine by its "}]},{"blank":4,"accepted":["amplitude"],"tail":","},{"runs":[{"v":" and adds them all to the "}]},{"blank":5,"accepted":["mean sea level","mean level","MSL"],"tail":"."}]},{"id":"diurnal","type":"choice","n":7,"explain":[{"v":"Diurnal means daily: one high and one low per cycle, about 23.93 hours for K1 and 25.82 hours for O1."}],"multi":false,"answer":["a"],"prompt":[{"v":"K1 and O1 are diurnal constituents. How many highs does each bring in a day?"}],"options":[{"id":"a","key":"A","runs":[{"v":"One"}]},{"id":"b","key":"B","runs":[{"v":"Two"}]},{"id":"c","key":"C","runs":[{"v":"Four"}]},{"id":"d","key":"D","runs":[{"v":"None; they only shift the timing"}]}]},{"id":"how-many","type":"choice","n":8,"explain":[{"v":"Thirty-seven covers most harbours; a few shallow estuaries need more, for the overtides shallow water makes."}],"multi":false,"answer":["c"],"prompt":[{"v":"How many constituents does Tidewater use for most harbours?"}],"options":[{"id":"a","key":"A","runs":[{"v":"4"}]},{"id":"b","key":"B","runs":[{"v":"8"}]},{"id":"c","key":"C","runs":[{"v":"37"}]},{"id":"d","key":"D","runs":[{"v":"128"}]}]},{"id":"mixed-tide","type":"recall","n":9,"explain":[],"prompt":[{"v":"What is a mixed tide?"}],"answerRuns":[{"v":"Two highs a day of clearly different heights: the diurnal constituents are strong enough to make one high taller than the other."}]},{"id":"phase-meaning","type":"choice","n":10,"explain":[{"v":"The phase, or epoch, is the lag in degrees between the astronomical pull and that wave's peak at the harbour."}],"multi":false,"answer":["b"],"prompt":[{"v":"In a harbour's harmonic table, what does a constituent's phase say?"}],"options":[{"id":"a","key":"A","runs":[{"v":"How tall that wave is there"}]},{"id":"b","key":"B","runs":[{"v":"How late that wave peaks there, behind its astronomical cause"}]},{"id":"c","key":"C","runs":[{"v":"Which day of the month it starts"}]},{"id":"d","key":"D","runs":[{"v":"Its period, in degrees"}]}]},{"id":"amplitude-units","type":"choice","n":11,"explain":[{"v":"Metres, at the harbour, so a prediction adds them up without a conversion."}],"multi":false,"answer":["a"],"prompt":[{"v":"Are amplitudes stored in metres, or as fractions of the mean range?"}],"options":[{"id":"a","key":"A","runs":[{"v":"Metres"}]},{"id":"b","key":"B","runs":[{"v":"Fractions of the mean range"}]}]},{"id":"nodal","type":"choice","n":12,"explain":[{"v":"As the moon's nodes regress over 18.61 years, the lunar constituents grow and shrink a little; the nodal factors f and u correct for it. "},{"v":"NOAA's harmonic constituents"},{"v":" list them per station."}],"multi":false,"answer":["a"],"prompt":[{"v":"Why do the lunar constituents get a small correction each year?"}],"options":[{"id":"a","key":"A","runs":[{"v":"The plane of the moon's orbit turns over an 18.6-year cycle"}]},{"id":"b","key":"B","runs":[{"v":"Leap years shift the calendar"}]},{"id":"c","key":"C","runs":[{"v":"Harbours silt up"}]},{"id":"d","key":"D","runs":[{"v":"Gauges drift"}]}]},{"id":"bigger-tides","type":"choice","n":13,"explain":[{"v":"Spring tides add M2 and S2, and at perigee the moon is nearest and pulls hardest. Neap tides, apogee and the quarter moons all make tides smaller."}],"multi":true,"answer":["a","b"],"prompt":[{"v":"Which of these make tides larger than usual?"}],"options":[{"id":"a","key":"A","runs":[{"v":"Spring tides"}]},{"id":"b","key":"B","runs":[{"v":"The moon at perigee"}]},{"id":"c","key":"C","runs":[{"v":"Neap tides"}]},{"id":"d","key":"D","runs":[{"v":"The moon at apogee"}]},{"id":"e","key":"E","runs":[{"v":"A first-quarter moon"}]}]},{"id":"overtides","type":"recall","n":14,"explain":[],"prompt":[{"v":"Why do shallow estuaries need overtides such as M4?"}],"answerRuns":[{"v":"In shallow water the tide slows in its troughs and steepens, which adds waves at multiples of the main frequencies; M4 runs at twice M2's speed."}]},{"id":"fit","type":"choice","n":15,"explain":[{"v":"The fit finds the amplitude and phase of each constituent that best explain the readings; a year is long enough to separate constituents whose speeds are close."}],"multi":false,"answer":["a"],"prompt":[{"v":"How does Tidewater get a new harbour's amplitudes and phases?"}],"options":[{"id":"a","key":"A","runs":[{"v":"A least-squares fit to at least a year of gauge readings"}]},{"id":"b","key":"B","runs":[{"v":"It copies them from the nearest harbour"}]},{"id":"c","key":"C","runs":[{"v":"It reads them from a global model"}]},{"id":"d","key":"D","runs":[{"v":"It averages the first week of readings"}]}]},{"id":"datum","type":"choice","n":16,"explain":[{"v":"Tide tables give heights above chart datum, so a printed height is the water you gain over the charted depth; "},{"v":"the datums chapter","f":"l","to":"chapter:tidewater/datums"},{"v":" covers the conversion."}],"multi":false,"answer":["b"],"prompt":[{"v":"Predictions are printed as heights above which level?"}],"options":[{"id":"a","key":"A","runs":[{"v":"Mean sea level"}]},{"id":"b","key":"B","runs":[{"v":"Chart datum"}]},{"id":"c","key":"C","runs":[{"v":"The gauge's zero"}]},{"id":"d","key":"D","runs":[{"v":"The harbour wall"}]}]},{"id":"step","type":"choice","n":17,"explain":[{"v":"A minute is fine enough for a tide table, and coarse enough to cache a year ahead."}],"multi":false,"answer":["b"],"prompt":[{"v":"At what step does Tidewater precompute predictions?"}],"options":[{"id":"a","key":"A","runs":[{"v":"Every second"}]},{"id":"b","key":"B","runs":[{"v":"Every minute"}]},{"id":"c","key":"C","runs":[{"v":"Every hour"}]},{"id":"d","key":"D","runs":[{"v":"Only at highs and lows"}]}]},{"id":"cached","type":"choice","n":18,"explain":[{"v":"It is served from "},{"v":"the prediction cache","f":"l","to":"chapter:tidewater/prediction-cache"},{"v":", filled a year ahead."}],"multi":false,"answer":["b"],"prompt":[{"v":"Is a prediction worked out again each time a reader asks for it?"}],"options":[{"id":"a","key":"A","runs":[{"v":"Yes, every time"}]},{"id":"b","key":"B","runs":[{"v":"No, it comes from the prediction cache"}]}]},{"id":"residual","type":"choice","n":19,"explain":[{"v":"Whatever the astronomical tide does not explain is left in the residual: surges, river flow and the gauge's own noise."}],"multi":false,"answer":["a"],"prompt":[{"v":"A storm surge shows up in the residual. What is the residual?"}],"options":[{"id":"a","key":"A","runs":[{"v":"Observed height minus predicted height"}]},{"id":"b","key":"B","runs":[{"v":"Predicted height minus chart datum"}]},{"id":"c","key":"C","runs":[{"v":"The highest astronomical tide"}]},{"id":"d","key":"D","runs":[{"v":"The gauge's error"}]}]},{"id":"surge","type":"recall","n":20,"explain":[],"prompt":[{"v":"Why can't the harmonic model predict a storm surge?"}],"answerRuns":[{"v":"A surge is driven by wind and air pressure, not by the moon and the sun, so it has no constant period to add as a wave."}]}]}},"fig":{"en":{"caption":[{"v":"Same corpus, two readers. Knowing which one you are looking at is the whole trick to reading "},{"v":"frontend.md","f":"c"},{"v":"."}],"items":[{"title":"The MkDocs viewer: retired, still shipped","tone":"muted","body":[[{"v":"The original public library: a hand-set stylesheet, search in the browser, and a graph built at publish time. It survives as a local tool and as the scaffold the plugin gives to self-hosters."}]]},{"title":"The Next.js app: today's product","tone":"accent","body":[[{"v":"Four route groups, a sealed-cookie backend-for-frontend, the public "},{"v":"/@{org}","f":"c"},{"v":" namespace and the sandboxed explainer. This is the app "},{"v":"the next chapter","f":"l","to":"chapter:maintainer-guide/shipping"},{"v":" ships."}]]}]},"enRules":{"caption":[],"items":[{"title":"Do: put a new style in its own flagged file","tone":"ok","body":[[{"v":"Anything the design handback had no specimen for goes in its own file, with a header that says so, never appended to the copied one."}]]},{"title":"Keep as is: the copied console stylesheet","tone":"store","body":[[{"v":"kb-console.css","f":"c"},{"v":" is copied verbatim from the design canvas. Editing it would forge a decision the design round never made."}]]},{"title":"Never: both sandbox flags at once","tone":"bad","body":[[{"v":"allow-scripts","f":"c"},{"v":" with "},{"v":"allow-same-origin","f":"c"},{"v":" lets a framed page remove its own sandbox."}]]}]},"ko":{"caption":[{"v":"같은 코퍼스, 두 개의 리더. 지금 어느 쪽을 보고 있는지 아는 것이 "},{"v":"frontend.md","f":"c"},{"v":"를 읽는 요령의 전부입니다."}],"items":[{"title":"MkDocs 뷰어: 은퇴했지만 여전히 배포됨","tone":"muted","body":[[{"v":"원래의 공개 라이브러리입니다. 손으로 짠 스타일시트, 브라우저 안의 검색, 발행 때 만든 그래프가 있습니다. 로컬 도구로, 그리고 플러그인이 셀프 호스팅 사용자에게 주는 뼈대로 남아 있습니다."}]]},{"title":"Next.js 앱: 오늘의 제품","tone":"accent","body":[[{"v":"네 개의 라우트 그룹, 봉인된 쿠키를 쓰는 BFF, 공개 "},{"v":"/@{org}","f":"c"},{"v":" 네임스페이스, 샌드박스 안의 설명서. "},{"v":"다음 장","f":"l","to":"chapter:maintainer-guide/shipping"},{"v":"이 배포하는 앱이 바로 이것입니다."}]]}]},"koRules":{"caption":[],"items":[{"title":"할 것: 새 스타일은 표시를 단 별도 파일에","tone":"ok","body":[[{"v":"디자인 핸드백에 견본이 없던 것은 복사한 파일에 덧붙이지 않고, 머리말로 표시한 별도 파일에 둡니다."}]]},{"title":"그대로 둘 것: 복사해 온 콘솔 스타일시트","tone":"store","body":[[{"v":"kb-console.css","f":"c"},{"v":"는 디자인 캔버스에서 그대로 복사한 파일입니다. 고치면 그 디자인 라운드가 내린 적 없는 결정을 꾸며 내는 셈입니다."}]]},{"title":"금지: 두 샌드박스 플래그를 함께","tone":"bad","body":[[{"v":"allow-scripts","f":"c"},{"v":" 옆에 "},{"v":"allow-same-origin","f":"c"},{"v":"을 두면 프레임 안의 페이지가 자기 샌드박스를 스스로 걷어 낼 수 있습니다."}]]}]}},"src":{"en":[{"id":"py-fsrs","title":"py-fsrs","titleParts":[{"v":"py-fsrs"}],"url":"https://github.com/open-spaced-repetition/py-fsrs","meta":["Open Spaced Repetition"],"note":[{"v":"The scheduler this library runs on the server. Its README lists the defaults, the 0.9 desired retention among them."}]},{"id":"w3c-annotation","title":"Web Annotation Data Model","titleParts":[{"v":"Web Annotation Data Model"}],"url":"https://www.w3.org/TR/annotation-model/","meta":["W3C","23 February 2017"],"note":[{"v":"See the Text Quote Selector: the exact text, with a prefix and a suffix."}]},{"id":"sample-long-sessions","title":"Notes on scheduling reviews for long reading sessions","titleParts":[{"v":"Notes on scheduling reviews for long reading sessions"}],"url":"https://example.com/learning/archive/2025/spaced-repetition/notes-on-scheduling-reviews-for-long-reading-sessions?ref=s1","meta":["Example Quarterly (sample)","June 2025","Accessed 18 October 2026"],"note":[]},{"id":"sample-korean","title":"간격 반복 입문: 망각 곡선에서 복습 일정까지","titleParts":[{"v":"간격 반복 입문","ko":1},{"v":": "},{"v":"망각 곡선에서 복습 일정까지","ko":1}],"url":"https://example.net/ko/spaced-review","meta":["예시 출판사 (샘플)","Accessed 18 October 2026"],"note":[]}],"ko":[{"id":"py-fsrs","title":"py-fsrs","titleParts":[{"v":"py-fsrs"}],"url":"https://github.com/open-spaced-repetition/py-fsrs","meta":["Open Spaced Repetition"],"note":[{"v":"이 라이브러리가 서버에서 돌리는 스케줄러입니다. README에 0.9 desired retention을 비롯한 기본값이 나옵니다."}]},{"id":"w3c-annotation","title":"Web Annotation Data Model","titleParts":[{"v":"Web Annotation Data Model"}],"url":"https://www.w3.org/TR/annotation-model/","meta":["W3C","23 February 2017"],"note":[{"v":"텍스트 인용 선택자(Text Quote Selector)를 보세요. 정확한 텍스트와 그 앞뒤 문맥입니다."}]},{"id":"sample-long-sessions","title":"Notes on scheduling reviews for long reading sessions","titleParts":[{"v":"Notes on scheduling reviews for long reading sessions"}],"url":"https://example.com/learning/archive/2025/spaced-repetition/notes-on-scheduling-reviews-for-long-reading-sessions?ref=s1","meta":["Example Quarterly (sample)","June 2025","Accessed 18 October 2026"],"note":[]},{"id":"sample-korean","title":"간격 반복 입문: 망각 곡선에서 복습 일정까지","titleParts":[{"v":"간격 반복 입문: 망각 곡선에서 복습 일정까지"}],"url":"https://example.net/ko/spaced-review","meta":["예시 출판사 (샘플)","Accessed 18 October 2026"],"note":[]}]}};
  var PP = {};
  PP.PRINTED = "20 Oct 2026";
  /* Paper in CSS px (96/in). The margins are today's @page margins: 16mm top, 15mm sides, 18mm bottom. */
  PP.PAPER = {
    a4: { name: "A4", w: 794, h: 1123, mt: 60, mx: 57, mb: 68 },
    letter: { name: "US Letter", w: 816, h: 1056, mt: 60, mx: 57, mb: 68 }
  };
  PP.GAP = 40;
  PP.dims = function (paper) {
    var p = PP.PAPER[paper] || PP.PAPER.a4;
    return { name: p.name, w: p.w, h: p.h, mt: p.mt, mx: p.mx, mb: p.mb, cw: p.w - 2 * p.mx, ch: p.h - p.mt - p.mb };
  };

  /* ---------- inline runs ---------- */
  function compactFromRD(runs) {
    var out = [];
    (runs || []).forEach(function (r) {
      var f = r.isCode ? "c" : r.isEm ? "e" : r.isStrong ? "s" : r.isDel ? "d" : r.isLink && !r.isMissing ? "l" : "";
      var parts = r.parts && r.parts.length ? r.parts : [{ v: r.v, isKo: false }];
      parts.forEach(function (p) {
        var o = { v: p.v, f: f, ko: p.isKo ? 1 : 0 };
        if (f === "l") o.to = r.to;
        out.push(o);
      });
    });
    return out;
  }
  /* What a link prints after its text: a same-app address in full, an outside URL as it is; an in-document # link and
     a bare link (text = address) print nothing more. */
  function hrefOf(to) {
    if (!to || to.charAt(0) === "#") return "";
    if (/^https?:\/\//.test(to)) return to;
    var m = /^chapter:(.+)$/.exec(to);
    if (m) return LG.HOST + LG.path(m[1]);
    m = /^doc:(.+)$/.exec(to);
    if (m) return LG.HOST + LG.path("doc/" + m[1]);
    if (to.charAt(0) === "/") return LG.HOST + to;
    return "";
  }
  /* An address on paper breaks after a "/" (or before "?" and "&"), never inside a word: a zero-width space marks each
     place (<wbr> in the build). A single segment wider than the column still wraps (overflow-wrap: anywhere). */
  function brk(a) { return String(a || "").replace(/\//g, "/\u200b").replace(/\/\u200b\/\u200b/g, "//").replace(/([?&])/g, "\u200b$1"); }
  PP.brk = brk;
  var CLS = { c: "pp-c", e: "pp-e", s: "pp-s", d: "pp-d", l: "pp-l" };
  function expand(cr, lang) {
    var out = [];
    for (var i = 0; i < cr.length; i++) {
      var r = cr[i], next = cr[i + 1];
      var o = { v: r.v, cls: CLS[r.f] || "pp-r", lang: r.ko ? "ko" : lang, hasHref: false, href: "" };
      if (r.f === "l" && r.to && !(next && next.to === r.to)) {
        var text = r.v, j = i - 1;
        while (j >= 0 && cr[j].to === r.to) { text = cr[j].v + text; j--; }
        var h = hrefOf(r.to);
        if (h && h !== text && h.replace(/^https?:\/\//, "") !== text) { o.hasHref = true; o.href = brk(h); }
      }
      out.push(o);
    }
    return out;
  }
  function R(rdRuns, lang) { return expand(compactFromRD(rdRuns), lang); }
  function C(compact, lang) { return expand(compact || [], lang); }
  function T(text, lang) { return [{ v: text, cls: "pp-r", lang: lang, hasHref: false, href: "" }]; }
  function partsRuns(parts, lang) {
    return (parts || []).map(function (p) { return { v: p.v, cls: "pp-r", lang: p.isKo || p.ko ? "ko" : lang, hasHref: false, href: "" }; });
  }
  function plain(cr) { return (cr || []).map(function (r) { return r.v; }).join(""); }

  /* ---------- blocks ---------- */
  var FLAGS = ["isHead", "isH2", "isH3", "isH4", "isP", "isList", "isCallout", "isCode", "isTable", "isQuote", "isHr",
    "isFigures", "isDiagram", "isQuiz", "isSources", "isAnswers", "isColophon", "isNotice"];
  function blk(flag, o) {
    var b = { at: "" };
    FLAGS.forEach(function (f) { b[f] = false; });
    b[flag] = true;
    for (var k in o) b[k] = o[k];
    return b;
  }
  function listOf(b, lang) {
    return {
      ordered: !!b.isOl, unordered: !b.isOl,
      items: b.items.map(function (it) {
        var sub = it.sub ? it.sub.items.map(function (s) { return { runs: R(s.runs, lang) }; }) : [];
        return { runs: R(it.runs, lang), hasSub: sub.length > 0, subOl: !!(it.sub && it.sub.ordered), subUl: !!(it.sub && !it.sub.ordered), sub: sub };
      })
    };
  }
  /* Code on paper: every line wraps, continuation lines hang 2ch in; an ASCII drawing scales down to fit the column
     (to 6.5pt, 8.67px, at the least) and only then wraps. */
  function codeOf(b, cw) {
    var lines = b.lines.map(function (l) {
      return { toks: l.toks.map(function (t) { return { v: t.v, cls: "pp-tk " + (t.c || "") }; }) };
    });
    var widest = 0;
    b.lines.forEach(function (l) { var n = l.toks.map(function (t) { return t.v; }).join("").length; if (n > widest) widest = n; });
    var size = 12;
    if (b.art && widest > 0) size = Math.max(8.67, Math.min(12, Math.floor((cw - 26) / (widest * 0.6) * 100) / 100));
    return {
      title: b.title || "", hasTitle: !!b.title, langLabel: b.langLabel || b.lang || "", hasLang: !!(b.langLabel || b.lang),
      hasBar: !!(b.title || b.langLabel || b.lang),
      art: !!b.art, cls: b.art ? "pp-code pp-code--art" : "pp-code", style: "font-size: " + size + "px", lines: lines,
      artNote: b.art && size < 12 ? "Set at " + Math.round(size * 0.75 * 10) / 10 + "pt to fit the column" : "", hasArtNote: !!(b.art && size < 12)
    };
  }
  function cellRuns(cell, lang) { return R(cell.runs, lang); }
  /* A table: rows never split; where it crosses a page it continues as a new piece that repeats the header row.
     `splits` are the row indexes that start a new page, measured on the canvas (the product's print engine repeats
     <thead> itself). */
  function tableOf(b, lang, splits) {
    var head = b.head.map(function (h) { return { runs: partsRuns(h.parts, lang) }; });
    var rows = b.rows.map(function (row, i) { return { r: i, cells: row.cells.map(function (c) { return { runs: cellRuns(c, lang) }; }) }; });
    var cuts = (splits || []).slice().sort(function (a, b2) { return a - b2; });
    /* a split at row 0 means the header row alone would end a page: the whole table starts on the next page */
    var chunks = [], start = 0, lead = cuts.indexOf(0) >= 0;
    cuts.concat([rows.length]).forEach(function (end) {
      if (end <= start) return;
      chunks.push({ rep: start > 0, from: start, rows: rows.slice(start, end), cls: (start > 0 || lead) ? "pp-t pp-t--cont" : "pp-t" });
      start = end;
    });
    return { head: head, chunks: chunks, cols: b.cols, wide: !!b.wide };
  }
  function calloutOf(b, lang, cw) {
    var body = b.body.map(function (x) {
      if (x.k === "list") return { isP: false, isList: true, isCode: false, list: listOf(x, lang), runs: [], code: null };
      if (x.k === "code") return { isP: false, isList: false, isCode: true, list: null, runs: [], code: codeOf(x, cw - 30) };
      return { isP: true, isList: false, isCode: false, list: null, runs: R(x.runs, lang), code: null };
    });
    return {
      word: b.typeWord, title: partsRuns(b.titleParts, lang), hasTitle: !!b.hasTitle, body: body,
      wasCollapsed: !!b.collapsed, cls: "pp-callout pp-callout--" + (b.tone || "note")
    };
  }

  /* The diagram "One FastAPI process, two planes" in its print tones: a store, two edges and a group of two nodes. */
  var DIAGRAM = {
    en: { group: "one FastAPI process, one uvicorn worker", n1: "Content plane", n1sub: "SQLite · FTS5 · WAL · rebuilt from docs/",
      n2: "Accounts plane", n2sub: "Postgres · SQLAlchemy · Alembic", store: "docs/<project>/<date>-<slug>.md",
      e1: "reindex()", e2: "async dependency, runs before the write lock" },
    ko: { group: "FastAPI 프로세스 하나, uvicorn 워커 하나", n1: "콘텐츠 평면", n1sub: "SQLite · FTS5 · WAL · docs/에서 다시 만듦",
      n2: "계정 평면", n2sub: "Postgres · SQLAlchemy · Alembic", store: "docs/<project>/<date>-<slug>.md",
      e1: "reindex()", e2: "비동기 의존성, 쓰기 잠금 전에 실행" }
  };

  function figuresOf(f, lang, cw, n) {
    var items = f.items.slice(0, n || f.items.length);
    var fit = Math.max(1, Math.floor((cw + 12) / (208 + 12)));
    var rowsN = Math.ceil(items.length / fit), cols = Math.ceil(items.length / rowsN);
    return {
      style: "grid-template-columns: repeat(" + cols + ", minmax(0, 1fr))",
      items: items.map(function (it) {
        return { title: T(it.title, lang), cls: "pp-card pp-card--" + (it.tone || "default"), body: it.body.map(function (p) { return { runs: C(p, lang) }; }) };
      }),
      caption: C(f.caption, lang), hasCaption: !!(f.caption && f.caption.length), sideBySide: cols === items.length,
      layout: cols === items.length ? "side by side" : rowsN + " rows of " + cols
    };
  }

  /* ---------- the quiz on paper, and its answer key ---------- */
  function quizOf(q, lang) {
    var n = q.items.length;
    var items = q.items.map(function (it) {
      var o = { n: it.n, isChoice: it.type === "choice", isCloze: it.type === "cloze", isRecall: it.type === "recall",
        prompt: [], hint: "", options: [], segs: [], lines: [] };
      if (it.type === "choice") {
        o.prompt = C(it.prompt, lang);
        o.hint = it.multi ? "Select all that apply." : "Choose one answer.";
        o.options = it.options.map(function (op) { return { key: op.key, runs: C(op.runs, lang), markCls: it.multi ? "pp-qk pp-qk--sq" : "pp-qk" }; });
      } else if (it.type === "cloze") {
        var blanks = it.segs.filter(function (s) { return s.blank; }).length;
        o.hint = blanks > 1 ? "Fill in the blanks." : "Fill in the blank.";
        o.segs = it.segs.map(function (s) {
          if (s.blank) return { isText: false, isBlank: true, runs: [], n: "(" + s.blank + ")", tail: s.tail || "" };
          return { isText: true, isBlank: false, runs: C(s.runs, lang), n: "", tail: "" };
        });
      } else {
        o.prompt = C(it.prompt, lang);
        o.hint = "Write your answer, then check it against the key.";
        o.lines = [1, 2, 3];
      }
      return o;
    });
    var answers = q.items.map(function (it) {
      var a = { n: it.n, key: "", hasKey: false, runs: [], explain: C(it.explain, lang), hasExplain: !!(it.explain && it.explain.length), label: "", hasLabel: false };
      if (it.type === "choice") {
        var picked = it.options.filter(function (op) { return it.answer.indexOf(op.id) >= 0; });
        a.key = picked.map(function (op) { return op.key; }).join(" and ").replace(/ and (?=.* and )/g, ", ");
        a.hasKey = true;
        var runs = [];
        picked.forEach(function (op, i) { if (i) runs.push({ v: "; " }); runs = runs.concat(op.runs); });
        a.runs = C(runs, lang);
      } else if (it.type === "cloze") {
        var runs2 = [];
        it.segs.filter(function (s) { return s.blank; }).forEach(function (s, i) {
          if (i) runs2.push({ v: " · " });
          runs2.push({ v: "(" + s.blank + ") " });
          runs2.push({ v: s.accepted[0], f: "s" });
          if (s.accepted.length > 1) runs2.push({ v: " (or " + s.accepted.slice(1).join(", or ") + ")" });
        });
        a.runs = C(runs2, lang);
      } else {
        a.label = "Answer"; a.hasLabel = true;
        a.runs = C(it.answerRuns, lang);
      }
      return a;
    });
    return {
      quiz: { label: "Quiz · " + n + (n === 1 ? " question" : " questions"), title: T(q.title, lang), items: items,
        note: "Answers are at the end of this chapter." },
      answers: { title: "Answers", lead: n + (n === 1 ? " answer" : " answers") + " to “" + q.title + "”, each with why.", items: answers }
    };
  }

  function sourcesOf(list, lang) {
    return {
      title: "Sources",
      items: list.map(function (s, i) {
        return { num: "[" + (i + 1) + "]", title: partsRuns(s.titleParts, lang), meta: s.meta.join(" · "), hasMeta: s.meta.length > 0,
          note: C(s.note, lang), hasNote: !!(s.note && s.note.length), url: brk(s.url) };
      })
    };
  }

  /* ---------- the masthead and the colophon ---------- */
  var LANG_NAME = { en: "English", ko: "한국어" };
  /* a short segment never breaks inside; a line breaks after a dot, never before one */
  var SEP = "\u00a0· ";
  function keep(s) { return String(s).replace(/ /g, "\u00a0"); }
  function ctxOf(key) {
    var c = RD.ctx(key) || { loose: true };
    var d = RD.docs[key] || {};
    if (c.loose) return { line: "knowledge" + SEP + (d.project || ""), loose: true, noun: "document" };
    return { line: "knowledge" + SEP + c.bookTitle + SEP + keep("Chapter " + c.n + " of " + c.total), loose: false, noun: "chapter" };
  }
  PP.head = function (key, lang, ver) {
    var r = RD.read(key, lang, ver), cx = ctxOf(key);
    var newest = RD.newest(key, r.lang), here = LG.addr(key, r.version, false, r.lang);
    var o = blk("isHead", {
      label: cx.line, title: T(r.title, r.lang), titleLang: r.lang, lede: T(r.summary || "", r.lang), hasLede: !!r.summary,
      addr: brk(here), meta: keep("v" + r.version + ", " + r.date) + SEP + keep("Printed " + PP.PRINTED), isOld: r.version !== newest,
      oldTag: "Older version · v" + r.version,
      old: "The current version is v" + newest + ", at " + brk(LG.addr(key, null, false, r.lang)) + ".", at: "top"
    });
    return o;
  };
  PP.colophon = function (key, lang, ver) {
    var r = RD.read(key, lang, ver), cx = ctxOf(key);
    var newest = RD.newest(key, r.lang), here = brk(LG.addr(key, r.version, false, r.lang)), cur = brk(LG.addr(key, null, false, r.lang));
    var lines = [cx.line + SEP + keep((LANG_NAME[r.lang] || r.lang) + " · v" + r.version)];
    var tail;
    if (r.version !== newest) tail = "This is v" + r.version + ", an earlier version; the current version is v" + newest + ", at " + cur + ".";
    else tail = "This is v" + r.version + ", the current version on that date; the address always opens the newest.";
    var from = "";
    if (r.from && RD.newest(key, r.from.lang) > r.from.v) {
      from = "Translated from " + LANG_NAME[r.from.lang] + " v" + r.from.v + ". " + LANG_NAME[r.from.lang] + " has been updated since: it is at v" + RD.newest(key, r.from.lang) + ".";
    }
    return blk("isColophon", { line: lines[0], printed: "Printed " + PP.PRINTED + " from " + here + ".", tail: tail, from: from, hasFrom: !!from, at: "end" });
  };

  /* ---------- a whole chapter ---------- */
  PP.chapter = function (key, lang, ver, paper, splits) {
    var d = PP.dims(paper), r = RD.read(key, lang, ver), L = r.lang, out = [];
    var isInt = key === "maintainer-guide/internals";
    var qk = !isInt ? null : L === "ko" ? "ko1" : r.version === 1 ? "en1" : "en2";
    var qz = qk ? quizOf(DATA.quiz[qk], L) : null;
    var seen = {};
    out.push(PP.head(key, lang, ver));
    r.blocks.forEach(function (b, i) {
      if (qz && i === DATA.quiz[qk].at) out.push(blk("isQuiz", { quiz: qz.quiz, at: "quiz" }));
      var o = null;
      if (b.k === "h") o = blk(b.level === 2 ? "isH2" : b.level === 3 ? "isH3" : "isH4", { runs: partsRuns(b.parts, L) });
      else if (b.k === "p") o = blk("isP", { runs: R(b.runs, L) });
      else if (b.k === "list") o = blk("isList", { list: listOf(b, L) });
      else if (b.k === "callout") o = blk("isCallout", { c: calloutOf(b, L, d.cw) });
      else if (b.k === "code") o = blk("isCode", { code: codeOf(b, d.cw) });
      else if (b.k === "table") {
        o = blk("isTable", { t: tableOf(b, L, (splits || {})["b" + i]), tid: "b" + i });
        if (!seen.table) { o.at = "table"; seen.table = 1; }
        if (b.long && !seen.long) { o.at = "longtable"; seen.long = 1; }
      }
      else if (b.k === "quote") o = blk("isQuote", { body: b.body.map(function (p) { return { runs: R(p.runs, L) }; }) });
      else if (b.k === "hr") o = blk("isHr", {});
      else if (b.k === "diagram") {
        var g = DIAGRAM[L] || DIAGRAM.en;
        o = blk("isDiagram", { g: g, title: partsRuns(b.titleParts, L), caption: R(b.caption, L), hasCaption: !!b.hasCaption, at: "diagram" });
      }
      if (o) out.push(o);
      /* the figure row (02-figures' "two-readers") after the flags table's callout */
      if (isInt && b.k === "callout" && b.type === "SKIP" && !seen.fig) {
        seen.fig = 1;
        out.push(blk("isFigures", { f: figuresOf(DATA.fig[L === "ko" ? "ko" : "en"], L, d.cw), at: "figures" }));
      }
    });
    if (qz && DATA.quiz[qk].at >= r.blocks.length) out.push(blk("isQuiz", { quiz: qz.quiz, at: "quiz" }));
    if (isInt) out.push(blk("isSources", { s: sourcesOf(DATA.src[L === "ko" ? "ko" : "en"], L), at: "sources" }));
    if (qz) out.push(blk("isAnswers", { a: qz.answers, at: "answers" }));
    out.push(PP.colophon(key, lang, ver));
    return { lang: L, blocks: out, title: r.title };
  };

  /* ---------- samples for the Components boards ---------- */
  var ART = [
    "  chart datum (LAT)          mean lower low water          mean sea level            mean higher high water           ",
    "  ------+---------------------------+---------------------------+---------------------------+------------------------>",
    "        |<-------- 0.42 m --------->|<--------- 1.18 m -------->|<--------- 1.31 m -------->|   heights rise right    ",
    "        |                           |                           |                           |                         ",
    "  station 8443970 · epoch 1983-2001 · every offset is measured from the chart datum on the left, not from sea level   ",
    "  a sounding of 3.0 m on the chart  =  3.0 m below LAT  =  3.42 m below MLLW  =  4.60 m below mean sea level          "
  ];
  PP.sample = function (name, paper, splits) {
    var d = PP.dims(paper), L = "en", out = [];
    var I = RD.read("maintainer-guide/internals", "en", 2);
    function find(pred) { for (var i = 0; i < I.blocks.length; i++) if (pred(I.blocks[i])) return { b: I.blocks[i], i: i }; return null; }
    if (name === "long") {
      out.push(blk("isH2", { runs: T("A wide ASCII drawing (118 columns)", L) }));
      out.push(blk("isP", { runs: T("Drawn in a code block marked as art. It scales down to fit the paper column, to 6.5pt at the least, and only then wraps; a drawing never runs off the paper.", L) }));
      out.push(blk("isCode", { code: codeOf({ art: true, title: "datum-ladder.txt", lang: "", lines: ART.map(function (s) { return { toks: [{ v: s, c: "" }] }; }) }, d.cw) }));
      var lc = find(function (b) { return b.k === "code" && b.title === "server/publish.py"; });
      out.push(blk("isH2", { runs: T("A long line of code", L) }));
      out.push(blk("isP", { runs: T("Every line wraps at the column; its continuation hangs two characters in, so a wrapped line never reads as a new one.", L) }));
      out.push(blk("isCode", { code: codeOf(lc.b, d.cw) }));
      var cc = find(function (b) { return b.k === "callout" && b.collapsed; });
      out.push(blk("isH2", { runs: T("A collapsed callout", L) }));
      out.push(blk("isP", { runs: T("Folded on screen, printed open: paper has no button to open it.", L) }));
      out.push(blk("isCallout", { c: calloutOf(cc.b, L, d.cw) }));
      out.push(blk("isH2", { runs: T("A figure row of four, wider than the column", L) }));
      out.push(blk("isP", { runs: T("Items stay side by side while each keeps 13rem; past that the row breaks into even rows, and never splits across a page.", L) }));
      var four = { caption: [{ v: "Four cards from the signed figure rows, set on paper as two rows of two." }], items: DATA.fig.en.items.concat(DATA.fig.enRules.items.slice(0, 2)) };
      out.push(blk("isFigures", { f: figuresOf(four, L, d.cw), at: "figures" }));
      var lt = find(function (b) { return b.k === "table" && b.long; });
      out.push(blk("isH2", { runs: T("A table across pages", L) }));
      out.push(blk("isP", { runs: T("Rows never split. Where the table meets the page's end it continues on the next page under its header row, repeated.", L) }));
      out.push(blk("isTable", { t: tableOf(lt.b, L, (splits || {})["b" + lt.i]), tid: "b" + lt.i, at: "table" }));
    } else if (name === "twenty") {
      var tq = quizOf(DATA.quiz.twenty, L);
      out.push(blk("isH2", { runs: T("Twenty questions, then their key", L) }));
      out.push(blk("isQuiz", { quiz: tq.quiz, at: "quiz" }));
      out.push(blk("isAnswers", { a: tq.answers, at: "answers" }));
    }
    return { lang: L, blocks: out, title: name };
  };

  /* ---------- the one notice sheet ⌘P prints from the legacy reader ---------- */
  PP.notice = function (key, lang, ver) {
    var r = RD.read(key, lang, ver), cx = ctxOf(key);
    return {
      label: cx.line,
      title: "This " + cx.noun + " prints from its own page",
      docTitle: r.title, noun: cx.noun,
      addr: brk(LG.addr(key, ver, true, r.lang)),

      printed: keep("Printed " + PP.PRINTED), titleLang: r.lang
    };
  };

  window.PP = PP;
})();

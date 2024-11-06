chrome.runtime.onMessage
    .addListener(function (message, sender, sendResponse) {
        initPlayer(message);
        sendResponse("OK");
    });


var player;

var subtitlesContainerEn;
var subtitlesContainerEs;
var scriptContainer;
var videoElement;
var videoOptions;
var tracks;
var trackEn;

function initPlayer(message) {

    videoElement = document.getElementById('myVideo');

    videoElement.className = "video-js";
    videoElement.controls = true;
    videoElement.preload = "auto";


    subtitlesContainerEn = document.getElementById("subtitles-container-en");
    subtitlesContainerEs = document.getElementById("subtitles-container-es");
    scriptContainer = document.getElementById('script-container');

    var customSubtitlesButton;

    videoElement.addEventListener('dblclick', toggleCustomFullscreen);


    subtitleArr = subtitleArr(message);


    var src = message[0].result.url;
    videoOptions = {
        controls: true,
        responsive: true,
        autoplay: true,
        preload: 'metadata',
        sources: [{ src: src, type: 'video/mp4' }],
        tracks: subtitleArr,
        controlBar: {
            fullscreenToggle: false,
            subsCapsButton: false
        }
    }

    player = videojs('myVideo', videoOptions);

    player.ready(function () {
        player.tech_.off('dblclick');
        addCustomSubtitlesMenu();
        customSubtitlesButton = player.controlBar.childNameIndex_["CustomSubtitlesButton"];

        customSubtitlesButton.items.forEach(subsCapsButton => {
            var subsEl = subsCapsButton.el()
            if (!subsCapsButton.track) {
                return;
            }
            if (subsCapsButton.track.label === 'subtitles off') {
                subsCapsButton.dispose(true);
                return;
            }
            
            subsCapsButton.track.mode = 'hidden';
            if (subsCapsButton.track.language === 'en' || subsCapsButton.track.language === 'ru') {
                subsCapsButton.selected(true);
                showSub(subsCapsButton.track);
                //subsCapsButton.el().click();
                //console.log(subsCapsButton.el());
                //subsEl.click();
                //setTimeout(() => {  subsEl.click(); }, 6000);
                //setTimeout(() => {  subsEl.classList.add("vjs-selected"); }, 6000);
                setTimeout(() => {  console.log(subsEl); }, 7000);
            }

            

        })

        for (var i = 0; i < tracks.length; i++) {
            if (tracks[i].language === 'en') {
                trackEn = tracks[i];
            }
        }

    });

    // Добавление кастомного элемента управления полноэкранным режимом
    player.getChild('controlBar').addChild('Button', {
        text: 'Toggle Fullscreen',
        el: videojs.dom.createEl('button', {
            className: 'vjs-fullscreen-control vjs-control vjs-button',
            onclick: toggleCustomFullscreen,
            innerHTML: '<span class="vjs-icon-placeholder" aria-hidden="true"></span> <span class="vjs-control-text" aria-live="polite">Fullscreen</span>'
        })
    });

    // player.textTracks().addEventListener('addtrack', function (addTrackEvent) {
    //     var track = addTrackEvent.track;
    //      track.mode = 'hidden';

    // });

    // Добавляем слушатель для события pause
    player.on('pause', function () {
        createSubtitleElements()
        scriptContainer.style.display = 'flex';
    });

    // Добавляем слушатель для события play
    player.on('play', function () {
        scriptContainer.style.display = 'none';
    });

    /// Меню субтитров

    function addCustomSubtitlesMenu() {
        // Получаем встроенные компоненты
        SubtitlesButton = videojs.getComponent('SubtitlesButton');
        SubsCapsButton = videojs.getComponent('SubsCapsButton');

        // Переопределяем кнопку субтитров
        class CustomSubtitlesButton extends SubtitlesButton {
            createItems() {
                // Переопределяем метод создания элементов меню
                const items = super.createItems();

                items.forEach(subsCapsButton => {
                    

                    if (subsCapsButton.track.label === 'subtitles off') {
                        subsCapsButton.dispose(true);
                        return
                    }

                    if (subsCapsButton.track.language === 'en' || subsCapsButton.track.language === 'ru') {
                        subsCapsButton.el().classList.add("vjs-selected");
                    }

                    subsCapsButton.handleClick = function () {

                        var isSelected = subsCapsButton.hasClass('vjs-selected');

                        if (isSelected) {
                            subsCapsButton.selected(false);
                            hideSub(subsCapsButton.track);
                        } else {
                            subsCapsButton.selected(true);
                            showSub(subsCapsButton.track);
                        }

                    }

                });

                return items;
            }
        }

        // Регистрируем переопределенную кнопку субтитров
        videojs.registerComponent('CustomSubtitlesButton', CustomSubtitlesButton);

        // Добавление кастомного компонента с меню в элементы управления
        player.getChild('ControlBar').addChild('CustomSubtitlesButton');

    }

    tracks = player.textTracks();

    pauseOnSubtitileMouseEnter();





}

function pauseOnSubtitileMouseEnter() {
    // Функция для остановки воспроизведения видео
    function pauseVideo() {
        player.pause();
    }

    // Функция для возобновления воспроизведения видео
    function playVideo() {
        player.play();
    }

    // Наведение курсора на контейнер с субтитрами
    subtitlesContainerEn.addEventListener('mouseenter', pauseVideo);
    subtitlesContainerEs.addEventListener('mouseenter', pauseVideo);

    // Увод курсора с контейнера с субтитрами
    subtitlesContainerEn.addEventListener('mouseleave', playVideo);
    subtitlesContainerEs.addEventListener('mouseleave', playVideo);
}

function showSub(track) {
    var subtContainer;
    // track.mode = 'hidden';
    if (track.language === "en") {
        subtContainer = subtitlesContainerEn;
    } else {
        subtContainer = subtitlesContainerEs;
    }
    track.addEventListener('cuechange', function () {
        var cues = track.activeCues;
        for (let index = 0; index < cues.length; index++) {
            subtContainer.innerHTML = cues[index].text;
        }
    });
}

function hideSub(track) {
    // track.mode = 'disabled';
    if (track.language === 'en') {
        subtitlesContainerEn.innerText = ""
    } else {
        subtitlesContainerEs.innerText = ""
    }
    track.removeEventListener('cuechange');
}

function subtitleArr(message) {
    result = [];
    subtSrcArr = message[0].result.response.subtitle.split(',');
    if (subtSrcArr === undefined || subtSrcArr.length == 0) {
        return result
    }
    for (let i = 0; i < subtSrcArr.length; i++) {
        subtArr = subtSrcArr[i].match(/(\[.*?\])(.*)/);
        if (subtArr[1] == undefined) {
            continue;
        }
        label = subtArr[1].replace('[', '').replace(']', '');
        lang = message[0].result.response.subtitle_lns[label];
        result.push({ src: subtArr[2], srclang: lang, label: label, kind: 'subtitles' });
    }
    return result
}

////////////////////////////////////////////////////////////////////////////


function toggleCustomFullscreen() {
    var elem = document.getElementById('video-container');

    if (document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement) {
        exitFullScreen();
    } else {
        requestFullScreen(elem);
    }
}

function requestFullScreen(elem) {
    if (elem.requestFullscreen) {
        elem.requestFullscreen();
    } else if (elem.webkitRequestFullscreen) {
        elem.webkitRequestFullscreen();
    } else if (elem.mozRequestFullScreen) {
        elem.mozRequestFullScreen();
    } else if (elem.msRequestFullscreen) {
        elem.msRequestFullscreen();
    }
}

function exitFullScreen() {
    if (document.exitFullscreen) {
        document.exitFullscreen();
    } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
    } else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen();
    } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
    }
}

/// Перемотка по фразам ///

document.addEventListener('keydown', function (event) {
    // Проверяем, что видеоплеер создан
    if (player) {
        switch (event.key) {
            case 'ArrowLeft': // Клавиша "назад"
                goToPreviousSubtitle();
                break;
            case 'ArrowRight': // Клавиша "вперед"
                goToNextSubtitle();
                break;
        }
    }
});

function goToPreviousSubtitle() {
    var currentSubtitleIndex = getCurrentSubtitleIndex();
    if (currentSubtitleIndex > 0) {
        player.currentTime(trackEn.cues[currentSubtitleIndex - 1].startTime);
    }
}

function goToNextSubtitle() {
    var currentSubtitleIndex = getCurrentSubtitleIndex();
    var totalSubtitles = trackEn.cues.length;
    if (currentSubtitleIndex < totalSubtitles - 1) {
        player.currentTime(trackEn.cues[currentSubtitleIndex + 1].startTime);
    }
}

function getCurrentSubtitleIndex() {
    var currentTime = player.currentTime();
    var cues = trackEn.cues;

    for (var i = 0; i < cues.length; i++) {
        if (currentTime < cues[i].endTime) {
            return i;
        }
    }

    return -1; // Возвращаем -1, если не найдено соответствие
}

/// -- Перемотка по фразам

/// Остановка по порбелу ///
document.addEventListener('keydown', function (event) {
    // Проверяем, что видеоплеер создан
    if (player) {
        if (event.key === ' ') { // Клавиша "пробел"
            if (player.paused()) {
                player.play();
            } else {
                player.pause();
            }
        }
    }
});


/// сценарий на паузе ...

var totalSubtitles = 16; // Количество последних субтитров для отображения
var scriptContainers = [];
var scriptContainer = document.getElementById('script-container');



// Функция создания элементов с субтитрами при паузе
function createSubtitleElements() {
    clearSubtitleElements();
  
    for (var i = 0; i < tracks.length; i++) {
        if (tracks[i].language === 'en') {
            trackEn = tracks[i];
        }
    }
    var currentSubtitleIndex = getCurrentSubtitleIndex();
    if (currentSubtitleIndex >= 0) {
        for (var i = 0; i < totalSubtitles; i++) {
            var subtitleIndex = currentSubtitleIndex - i;
            if (subtitleIndex >= 0) {
                var subtitleText = trackEn.cues[subtitleIndex].text;
                var displayedSubtitleNumber = i + 1;
                createAndDisplaySubtitleElement(subtitleText, subtitleIndex);
            }
        }
    }
}

// Функция очистки текущих элементов с субтитрами
function clearSubtitleElements() {
    var subtitleElements = scriptContainer.getElementsByClassName('subtitle-element');
    Array.from(subtitleElements).forEach(function (element) {
        element.remove();
    });
}

// Функция создания и отображения элемента с субтитром
function createAndDisplaySubtitleElement(subtitleText, subtitleIndex) {
    var subtitleElement = document.createElement('div');
    subtitleElement.className = 'subtitle-element';
    subtitleElement.innerHTML = subtitleText;

    // Добавляем порядковый номер субтитра к элементу
    subtitleElement.setAttribute('data-subtitle-index', subtitleIndex);

    // Устанавливаем порядок элемента
    subtitleElement.style.order = subtitleIndex;

    // Добавляем слушатель для клика по элементу с субтитром
    subtitleElement.addEventListener('click', function () {
        seekToSubtitle(subtitleElement);
    });

    scriptContainer.appendChild(subtitleElement);
}

// Функция воспроизведения видео с момента субтитра
function seekToSubtitle(subtitleElement) {
    var subtitleIndex = subtitleElement.getAttribute('data-subtitle-index');
    var cues = trackEn.cues;
    var targetCue = cues[subtitleIndex];

    if (targetCue) {
        player.currentTime(targetCue.startTime);
        player.play();
    }
}


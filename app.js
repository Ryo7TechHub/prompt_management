$(function() {
    var editIndex = null;
    var notificationTimeout;

    $("#sortable").sortable({
        update: function(event, ui) {
            savePromptOrder();
        }
    });
    $("#sortable").disableSelection();

    function searchPrompts() {
        var searchValue = $("#search-box").val().toLowerCase().replace(/[Ａ-Ｚａ-ｚ０-９]/g, function(s) {
            return String.fromCharCode(s.charCodeAt(0) - 0xFEE0);
        });
        var hasMatch = false;
        $(".prompt-item").each(function() {
            var promptContent = $(this).find(".prompt-content").text().toLowerCase().replace(/[Ａ-Ｚａ-ｚ０-９]/g, function(s) {
                return String.fromCharCode(s.charCodeAt(0) - 0xFEE0);
            });
            if (promptContent.includes(searchValue)) {
                $(this).show();
                hasMatch = true;
            } else {
                $(this).hide();
            }
        });
        if (!hasMatch && searchValue!='') {
            $("#no-match").show();
        } else {
            $("#no-match").hide();
        }
    }

    $("#search-box").on("input", searchPrompts);

    function hideNotification() {
        $("#clipboard-notification").hide();
    }

    function showClipboardNotification() {
        var notification = $("#clipboard-notification");
        
        clearTimeout(notificationTimeout);
        
        notification.hide().fadeIn();
        
        notificationTimeout = setTimeout(function() {
            notification.fadeOut();
        }, 2000);
    }

    $("#open-popup").on("click", function() {
        $("#popup-form").show();
        $("#overlay").show();
        $("#prompt-form")[0].reset();
        $("#error-message").hide();
        editIndex = null;
        $("#delete-button").hide();
        hideNotification();
    });

    $(".close, .close-notification, #overlay").on("click", function() {
        $("#popup-form").hide();
        $("#overlay").hide();
        $("#clipboard-notification").hide();
        hideNotification();
    });

    $("#prompt-form").on("submit", function(e) {
        e.preventDefault();
        var title = $("#title").val();
        var note = $("#note").val();
        var prompt = $("#prompt").val();

        if (!title || !prompt) {
            $("#error-message").text("タイトルとプロンプトは必須項目です。").show();
            return;
        }

        chrome.storage.sync.get(["prompts", "promptOrder"], function(data) {
            var prompts = data.prompts || [];
            var promptOrder = data.promptOrder || [];

            if (editIndex !== null) {
                prompts[editIndex] = { id: prompts[editIndex].id, title: title, note: note, prompt: prompt };
            } else {
                var newId = Date.now().toString();
                prompts.push({ id: newId, title: title, note: note, prompt: prompt });
                promptOrder.push(newId);
            }

            chrome.storage.sync.set({ prompts: prompts, promptOrder: promptOrder }, function() {
                renderPrompts();
                $("#popup-form").hide();
                $("#overlay").hide();
                $("#prompt-form")[0].reset();
            });
        });
        hideNotification();
    });

    function savePromptOrder() {
        var newOrder = $("#sortable").sortable("toArray", {attribute: "data-id"});
        chrome.storage.sync.set({promptOrder: newOrder});
    }

    function renderPrompts() {
        chrome.storage.sync.get(["prompts", "promptOrder"], function(data) {
            var prompts = data.prompts || [];
            var promptOrder = data.promptOrder || [];

            // プロンプトの順序を適用
            if (promptOrder.length > 0) {
                prompts = promptOrder.map(id => prompts.find(p => p.id === id)).filter(Boolean);
            }

            $("#sortable").empty();
            prompts.forEach(function(item, index) {
                var newItem = $(
                    '<li class="prompt-item" data-id="' + item.id + '" data-note="' + item.note + '" data-prompt="' + item.prompt + '">' +
                    '<span class="prompt-content">' + item.title + '</span>' +
                    '<button class="edit-button" title="編集"><img src="images/edit.svg" class="edit-icon" alt="編集アイコン"></button></li>'
                );
                $("#sortable").append(newItem);
            });
            searchPrompts();
        });
    }

    $("#sortable").on("click", ".edit-button", function(e) {
        e.stopPropagation();
        editIndex = $(this).parent().index();
        chrome.storage.sync.get("prompts", function(data) {
            var item = data.prompts[editIndex];
            $("#title").val(item.title);
            $("#note").val(item.note);
            $("#prompt").val(item.prompt);
            $("#popup-form").show();
            $("#overlay").show();
            $("#delete-button").show();
            $("#error-message").hide();
            hideNotification();
        });
    });

    $("#sortable").on("click", ".prompt-item", function() {
        var promptText = $(this).data("prompt");
        navigator.clipboard.writeText(promptText).then(showClipboardNotification);
    });

    $("#delete-button").on("click", function() {
        if (editIndex !== null) {
            chrome.storage.sync.get(["prompts", "promptOrder"], function(data) {
                var prompts = data.prompts || [];
                var promptOrder = data.promptOrder || [];
                var deletedId = prompts[editIndex].id;
                prompts.splice(editIndex, 1);
                promptOrder = promptOrder.filter(id => id !== deletedId);
                chrome.storage.sync.set({ prompts: prompts, promptOrder: promptOrder }, function() {
                    renderPrompts();
                    $("#popup-form").hide();
                    $("#overlay").hide();
                    $("#prompt-form")[0].reset();
                });
            });
        }
        hideNotification();
    });

    $("#search-box").on("focus", hideNotification);
    
    // 初期ロード時にプロンプトをレンダリング
    renderPrompts();
});
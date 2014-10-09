/*global jQuery*/
/*jshint maxcomplexity:false */

'use strict';

(function ($) {

    var handle = '[data-editor=dropdowneditor]';
    var Dropdowneditor = function (element, options) {
        this.$element = 
        this.options = 
        this.$labelSection =
        this.$label =
        this.$itemsSection =
        this.$mockviewSection =
        this.$singleItem =
        this.$editorTools =
        this.$editControl =
        this.$deleteControl =
        this.$addMoreLink =
        this.$modeswitches =
        this.$footerSection =
        this.itemCount = 
        this.serialized =
        this.currentmode =
        this.lastItemRemoved = null,
        this.previousSerialized = {},
        this.singleItemModes = {},
        this.placeholderText;

        this.init(element, options);
    };

    Dropdowneditor.DEFAULTS = {
        labelSection: '[data-editor-section=label]',
        itemsSection: '[data-editor-section=fielditems]',
        singleItemSection: '[data-editor-section=singleitem]',
        editorTools: '[data-editor-section=tools]',
        footerSection: '[data-editor-section=footer]',
        editControl: '[data-editor-control=edit]',
        deleteControl: '[data-editor-control=delete]',
        removeItemControl : '[data-editor-control=removeitem]',
        addMoreControl: '[data-editor-control=addmore]',
        modeswitcheControl: '[data-editor-control=switch]',
        hiddenClassName: 'hidden',
        collapseClassName: 'field-editor-collapse',
        expandClassName: 'field-editor-expand',
        expandingClassName: 'field-editor-expanding',
        editIconClassName: 'glyphicon-pencil',
        collapseIconClassName: 'glyphicon-resize-small',
        autoHideTools: true,
        defaultNoOfItems: 3,
        maxNoOfItems: 6,
        modes: ['default'], //default is just a placeholder
        defaultMode: 'default', //default is just a placeholder
        showOptionCounter: true,
        onBeforeItemAdded: undefined,
        onAfterItemAdded: undefined,
        modeSwitchCondition: undefined,
        onModeSwitch: undefined,
        useKeyupOnLabel: true
    };

    function bindUIElements(context) {
        context.$labelSection = context.$element.find(context.options.labelSection);
        context.$itemsSection = context.$element.find(context.options.itemsSection);
        context.$mockviewSection = context.$element.find(context.options.mockviewSection);
        context.$footerSection = context.$element.find(context.options.footerSection);
        context.$addMoreLink = context.$element.find(context.options.addMoreControl);
        context.$modeswitches = context.$element.find(context.options.modeswitcheControl);
        context.$label = context.$labelSection.children().detach().hide(); //detach label section and use it as a template in memory
        context.$singleItem = context.$itemsSection.find(context.options.singleItemSection).detach().hide(); //detach single item from items section on DOM, and use it as a template in memory
        context.$editorTools = context.$label.find(context.options.editorTools);
        context.$editControl = context.$editorTools.find(context.options.editControl);
        context.$deleteControl = context.$editorTools.find(context.options.deleteControl);
    }

    function initSingleItemTemplates(context) {
        var that = context,
            evt_remove = $.Event('removeItem.widget.dropdowneditor');

        //do event handling and stuff in each SINGLE ITEM template
        context.$singleItem.each(function (index, template) {
            var removeItemControl = $(template).find(that.options.removeItemControl);
            //bind remove item handler to removeItemControl in the template
            removeItemControl.find('button').on('click', function (e) {
                var $parent = $(this).closest(that.options.singleItemSection);
                $parent.find('input').css('background-color', '#ffbdbd');
                // $parent.find('button').not(this).css('background-color', '#ffbdbd');
                $parent.fadeOut(400, 'easeInOutQuad', function () {
                    that.lastItemRemoved = $parent.data('index'); //store the item's index until next removal
                    $parent.remove();
                    that.itemCount -= 1;
                    that.$addMoreLink.removeClass('bf-disabled');
                    that.$addMoreLink.siblings('.bf-addon').removeClass('bf-disabled');
                    that.$element.trigger(evt_remove, [that.lastItemRemoved]);
                    that.index(); //re-index items
                });
            });

            if (that.options.autoHideTools) {
                removeItemControl.hide();
                that.$singleItem.hover(
                    function () {
                        $(this).find(that.options.removeItemControl).show();
                    },
                    function () {
                        $(this).find(that.options.removeItemControl).hide();
                    }
                );
            }

            $.each(that.options.modes, function (modeIndex) {
                if (that.options.modes[modeIndex] === $(template).attr('data-mode')) {
                    that.singleItemModes[that.options.modes[modeIndex]] = template;
                }
            });
        });
    }

    function initControlAddmore(context) {
        var that = context,
            evt_max =  $.Event('maximumItem.widget.dropdowneditor');
        //bind add item handler to add more control
        context.$addMoreLink.on('click', function (e) {
            e.preventDefault();
            if (that.itemCount < that.options.maxNoOfItems) {
                that.add();
                that.index(); //re-index after adding
                that.itemCount += 1;
                if (that.itemCount === that.options.maxNoOfItems) {
                    $(this).addClass('bf-disabled');
                    $(this).siblings('.bf-addon').addClass('bf-disabled');
                }
            } else {
                that.$element.trigger(evt_max);
            }
        });
    }

    function initSingleItemsModeSwitch(context) {
        var that = context;
        //bind mode switch handler to switch control
        context.$modeswitches.on('click', function (e) {
            var mode = $(e.target).attr('data-switch-mode');
            e.preventDefault();
            if (typeof that.options.modeSwitchCondition === 'function') {
                if (that.options.modeSwitchCondition(mode)) {
                    that.mode(mode);
                    that.updateswitch();
                } else {
                    return false;
                }
            } else {
                that.mode(mode);
                that.updateswitch();
            }
            
        });
    }

    function initEditorTools(context) {
        var that = context,
            evt_delete = $.Event('removeEditor.widget.dropdowneditor');
        context.$deleteControl.find('a').on('click dblclick', function (e) {
            e.preventDefault();
            that.$element.find('input').css('background-color', '#ffbdbd');
            that.$element.delay(100).fadeOut(600, 'easeInOutQuad', function () {
                $(this).hide();
                that.$element.trigger(evt_delete);
                $(this).remove();
            });
        });

        context.$editControl.find('a').on('click dblclick', function (e) {
            e.preventDefault();
            if (context.$element.hasClass(context.options.collapseClassName)) {
                that.$element.trigger($.Event('beforeExpand.widget.dropdowneditor'));
                context.show(null, null, true);
            } else {
                context.hide();
            }
        });

        if (context.options.autoHideTools) {
            context.$editorTools.hide();
            context.$labelSection.hover(
                function () {
                    context.$editorTools.show();
                },
                function () {
                    context.$editorTools.hide();
                }
            );
        }
    }

    Dropdowneditor.prototype.init = function (element, options) {
        var that = this,
            i, $el,
            removeItemControl;
            
        this.$element = $(element);
        this.options = this.getOptions(options);
        this.itemCount = 0;
        this.currentmode = this.options.defaultMode; //set mode to default

        //init helpers
        bindUIElements(this);
        initSingleItemTemplates(this);
        initControlAddmore(this);
        initEditorTools(this);
        initSingleItemsModeSwitch(this);
        this.updateswitch();
        this.placeholderText = this.$singleItem.find('input:first').attr('placeholder'); //save placeholder text from template

        /*LABEL AND MENU OPTIONS CREATION*/
        this.$element.addClass(this.options.collapseClassName);
        this.$itemsSection.hide();
        this.label();
        //add default number of items
        for (i = 0; i < that.options.defaultNoOfItems; i++) {
            that.add();
            that.itemCount += 1;
        }
        this.$labelSection.show();
        this.$element.removeClass(this.options.hiddenClassName).addClass(this.options.expandClassName);
        this.$element.trigger($.Event('createdEditor.widget.dropdowneditor'));
        /*LABEL AND MENU OPTIONS CREATION*/
        
    };

    Dropdowneditor.prototype.label = function (text) {
        var labelInput = this.$label.find('input[type=text]'),
            labelHiddenInput = this.$label.find('input[type=hidden]'),
            evt_new = $.Event('addNewLabel.widget.dropdowneditor'),
            evt_change = $.Event('updateLabel.widget.dropdowneditor'),
            that = this;
        this.$labelSection.hide();
        labelInput.val(text);
        labelHiddenInput.val(text);
        if (this.options.useKeyupOnLabel) {
            labelInput.on('keyup', function (e) {
                labelHiddenInput.val($(this).val());
                that.$element.trigger(evt_change);
            });
        } else {
            labelInput.on('change', function (e) {
                labelHiddenInput.val($(this).val());
                that.$element.trigger(evt_change);
            });
        }
        this.$labelSection.append(this.$label.show());
        this.$element.trigger(evt_new);
    };

    Dropdowneditor.prototype.add = function (values, silent) {
        var $el, mode,
            that = this,
            evt_change = $.Event('updateSingleItem.widget.dropdowneditor'),
            evt_add = $.Event('addSingleItem.widget.dropdowneditor');

        mode = values && values.mode || this.currentmode;

        $el = $(this.singleItemModes[mode]).clone(true, true); //deep clone template to get data and bindings

        if (this.options.onBeforeItemAdded && typeof this.options.onBeforeItemAdded === 'function') {
            this.options.onBeforeItemAdded.call($el, this.$itemsSection.find(this.options.singleItemSection).length, mode);
        }

        $el.find('input').on('change.inputfield.bf.dropdowneditor', function () {
            var arrayStrings = [],
                singleItemSection = $(this).closest(that.options.singleItemSection),
                inputs = singleItemSection.find('input'),
                inlineInputs = that.$itemsSection.find(that.options.singleItemSection),
                index = inlineInputs.index(singleItemSection),
                concatText = (function () {
                    inputs.each(function (index, el) {
                        arrayStrings.push($(el).val());
                    });
                    return $.trim(arrayStrings.join(' '));
                }()),
                optionValue = arrayStrings[0]; //taking first input 
            that.$element.trigger(evt_change, [$el, concatText, optionValue, index]);
        });

        if (values && $.isArray(values)) {
            $el.find('input').each(function (index) {
                if (values[index] && values[index] !== '') {
                    $(this).val(values[index]).change(); //also trigger change event
                }
            });
        }
        
        this.$itemsSection.append($el);
        this.index(); //re-index the items
        $el.fadeIn('fast');
        if (values) { //TODO! too many change events triggered....
            $el.find('input').first().change();
        }

        if (this.options.onAfterItemAdded && typeof this.options.onAfterItemAdded === 'function') {
            this.options.onAfterItemAdded.call($el);
        }

        if (silent && silent === true) {
            return false;
        }
        this.$element.trigger(evt_add, [$el]);
    },

    Dropdowneditor.prototype.updateswitch = function () {
        var mode = this.currentmode;
        this.$modeswitches.show().filter('[data-switch-mode=' + this.currentmode + ']').hide();
        if (this.options.onModeSwitch && typeof this.options.onModeSwitch === 'function') {
            this.options.onModeSwitch.call(this.$element, mode);
        }
    },

    Dropdowneditor.prototype.mode = function (mode) {
        var inputdata,
            that = this,
            evt_mode = $.Event('modeSwitch.widget.dropdowneditor');

        if (mode === this.currentmode) {
            return false;
        }

        this.serialize(); //saved to this.serialized
        inputdata = this.serialized;

        if (inputdata.items && this.previousSerialized.items) {
            $.each(inputdata.items, function (index, item) {
                if (that.previousSerialized.items[index]) {
                    if (item[0] === that.previousSerialized.items[index][0]) { //first string is exactly the same as previous before mode switch
                        if (item.length < that.previousSerialized.items[index].length) {
                            inputdata.items[index] = that.previousSerialized.items[index]; //take the previous data for display
                        } else {
                            that.previousSerialized.items[index] = inputdata.items[index]; //update previous data with current
                        }
                    }
                }
            });
        }

        this.previousSerialized = inputdata; //update copy of previous data with

        this.$itemsSection.empty();
        this.itemCount = 0;
        this.currentmode = mode;
        inputdata.mode = mode;
        this.populate(inputdata); //display

        // this.updateswitch();

        that.$element.trigger(evt_mode, [mode]);

    },

    Dropdowneditor.prototype.remove = function (index) {
        var that = this,
            $el = this.$itemsSection.find(this.options.singleItemSection).eq(index);
        if ($el.data('index') === index) {

            $el.fadeOut('fast', function () {
                that.lastItemRemoved = $el.data('index'); //store the item's index until next removal
                $el.remove();
                that.itemCount -= 1;
                that.$addMoreLink.removeClass('bf-disabled');
                that.$addMoreLink.siblings('.bf-addon').removeClass('bf-disabled');
                that.index(); //re-index items
            });
        }
    },

    Dropdowneditor.prototype.hide = function (callback) {
        var that = this,
            label = this.$labelSection.find('input[type=text]').val(),
            evt_collapse = $.Event('collapseEditor.widget.dropdowneditor');

        this.$footerSection.slideUp();
        this.$itemsSection.slideUp(600, 'swing', function () {
            that.$element.removeClass(that.options.expandClassName).addClass(that.options.collapseClassName);
            that.$editControl.find('span.glyphicon').addClass(that.options.editIconClassName).removeClass(that.options.collapseIconClassName);
            if (typeof callback === 'function') {
                callback.apply(this);
            }
            that.$element.trigger(evt_collapse);
        });
    };

    Dropdowneditor.prototype.show = function (callbacks, silent, triggeredByEditControl) {
        var that = this,
            evt_expand = $.Event('expandEditor.widget.dropdowneditor');

        if (callbacks && typeof callbacks.beforeShow === 'function') {
            callbacks.beforeShow.apply(this);
        }

        this.$footerSection.slideDown();
        that.$element.addClass(that.options.expandingClassName);
        that.$itemsSection.delay(100).slideDown(500, 'swing', function () {
            that.$element.removeClass(that.options.collapseClassName + ' ' + that.options.expandingClassName)
                .addClass(that.options.expandClassName);
            that.$editControl.find('span.glyphicon').addClass(that.options.collapseIconClassName).removeClass(that.options.editIconClassName);
            if (callbacks && typeof callbacks.onShow === 'function') {
                callbacks.onShow();
            }
            if (!silent) {
                that.$element.trigger(evt_expand, [triggeredByEditControl]);
            }
        });
    };

    Dropdowneditor.prototype.index = function () {
        var that = this,
            placeholderText,
            firstInput;
        this.$itemsSection.find(this.options.singleItemSection).each(function (index) {
            $(this).data('index', index);
            
            // //TEMP FIX - FETCH from input element [data-example{N}] data-example0="1 hr guitor class" data-example1="3 hr guitor class" data-example2="5 hr guitor class" 
            // var exampleText = '';
            // if(index == 0) {
            //     exampleText = "1 hr guitor class";
            // }
            // if(index == 1) {
            //     exampleText = "3 hr guitor class";
            // }
            // if(index == 2) {
            //     exampleText = "5 hr guitor class";
            // }
            
            // if (that.options.showOptionCounter) {
            //     if(index == 0) {
            //         //Fetch content and maxlength from input element
            //         $(this).find('input:first').attr('data-content','eg. Small, Medium, Large').attr('maxlength','60');
            //     }
            //     $(this).find('input:first').attr('placeholder', that.placeholderText + ' ' + (index + 1) + ' (eg.' + exampleText + ")");
                
            //     //TEMP FIX -
            //     if(index == 0) {
            //         //Fetch content and maxlength from input element
            //         $(this).find('input:first').attr('data-content','eg. 1 hr guitor class, 3 hr guitor class, 5 hr guitor class').attr('maxlength','60');
            //     }
            // }
        });
    },

    Dropdowneditor.prototype.getDefaults = function () {
        return Dropdowneditor.DEFAULTS;
    };

    Dropdowneditor.prototype.getOptions = function (options) {
        options = $.extend({}, this.getDefaults(), this.$element.data(), options);
        return options;
    };

    Dropdowneditor.prototype.reset = function () {
        var i;

        this.$element.hide();
        this.$element.addClass(this.options.hiddenClassName);
        
        this.$itemsSection.find(this.options.singleItemSection).remove();
        this.$labelSection.find('input').val('');
        this.itemCount = 0;
        this.lastItemRemoved = undefined;
        this.serialized = 0;

        this.$element.removeClass(this.options.hiddenClassName);
        this.$element.show();

        //add default number of items
        for (i = 0; i < this.options.defaultNoOfItems; i++) {
            this.add();
        }

    };

    Dropdowneditor.prototype.populate = function (options) {
        //populate and trigger change events
        var that = this,
            $el = this.$itemsSection.find(this.options.singleItemSection),
            items = [],
            strings = [];

        if (typeof options !== 'object') {
            return false;//exit
        }
        
        if (options.label) {
            this.$labelSection.find('input[type=text]').val(options.label).change();
            this.$labelSection.find('input[type=hidden]').val(options.label).change();
        }

        if (options.items && $.isArray(options.items)) {
            items = options.items;
            //assume an array of arrays containing strings
            if ($el.length > 0) {
                $el.each(function (elementIndex) {
                    strings = items.shift();
                    $(this).find('input').each(function (inlineInputIndex) {
                        $(this).val(strings[inlineInputIndex]).change();
                    });
                });
            }

            //seems to have more items in options than inputs on DOM, add them to DOM...
            if (items.length > 0) {
                $.each(items, function (index, arrayOfStrings) {
                    // if (typeof options.mode === 'string') {
                    //     that.currentmode = options.mode; //update current mode
                    //     that.$element.trigger($.Event('modeSwitch.widget.dropdowneditor', [that.currentmode]));
                    // }
                    if (that.itemCount < that.options.maxNoOfItems) {
                        that.add(arrayOfStrings, true);
                        that.itemCount += 1;
                    }
                });
            }
        }

        this.serialized = options;
    };

    Dropdowneditor.prototype.serialize = function () {
        var serialized = {label: '', items: []},
            label = this.$labelSection.find('input[type=hidden]').val(),
            $el = this.$itemsSection.find(this.options.singleItemSection);

        serialized.label = label;
        $el.each(function (elementIndex) {
            serialized.items.push([]);
            $(this).find('input').each(function () {
                serialized.items[elementIndex].push($(this).val());
            });
        });

        this.serialized = serialized;
    };

    // PLUGIN DEFINITION
    var old = $.fn.dropdowneditor;

    $.fn.dropdowneditor = function (option) {
        var args = Array.prototype.slice.call(arguments, 0);

        return this.each(function () {
            var $this   = $(this);
            var data    = $this.data('bf.dropdowneditor');
            var options = $.extend({}, Dropdowneditor.DEFAULTS, $this.data(), typeof args[0] === 'object' && option);

            if (!data) {
                $this.data('bf.dropdowneditor', (data = new Dropdowneditor(this, options)));
            } else if (!option) {
                data.reset();
            }
            if (args.length > 1) { 
                data[args[0]](args[1]);
            } else if (args.length === 1 && typeof args[0] === 'string') {
                data[args[0]]();
            }
        });
    };

    $.fn.dropdowneditor.Constructor = Dropdowneditor;


    // NO CONFLICT
    // ===================

    $.fn.dropdowneditor.noConflict = function () {
        $.fn.dropdowneditor = old;
        return this;
    };

}(jQuery));
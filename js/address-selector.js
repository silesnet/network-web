/*
var selector = new AddressSelector('inputId', {
    minQueryLength: 3,
    listClass: 'addressesList',
    itemClass: 'addressItem',
    selectedItemClass: 'selectedAddressItem'
  }) 
  .onSearch(function(query, cb) {
    return [];
  })
  .onAddress(function(address) {
    console.log(address);
  });
*/

(function() {
  this.AddressSelector = function() {
    this.input = {
      query: ''
    };
    this.list =  {
      selected: -1,
      addresses: []
    };
    this.overrideKeys = ['Tab', 'ArrowDown', 'ArrowUp', 'Enter', 'Escape'];
    this.onSearchFn = function(query) {
      console.log(query);
      return [];
    };
    this.onAddressFn = function(address) {
      console.log(address);
    };

    var selector = arguments[0] || '';
    if (!selector) {
      throw new Error('input selector not specified');
    }

    var defaults = {
      minQueryLength: 3,
      maxItems: 30,
      listClass: 'addressesList',
      itemClass: 'addressItem',
      selectedItemClass: 'selectedAddressItem'
    };
    this.options = extendDefaults(defaults, arguments[1]);

    buildElements.call(this, selector);

    initializeEvents.call(this);

    return this;
  };

  AddressSelector.prototype.onSearch = function(fn) {
    this.onSearchFn = fn;
    return this;
  };

  AddressSelector.prototype.onAddress = function(fn) {
    this.onAddressFn = fn;
    return this;
  };

  AddressSelector.prototype.destroy = function() {
    this.list.element.remove();
  };

  function buildElements(selector) {
    addDefaultStyles.call(this);

    var inputElement = document.getElementById(selector);
    if (!inputElement || inputElement.localName !== 'input') {
      throw new Error("input#" + selector + " doesnot exist");
    }
    inputElement.autocomplete = 'off';
    this.input.element = inputElement;

    var listElement = document.createElement('div');
    listElement.style.position = 'absolute';
    listElement.style['z-index'] = 1000000;
    listElement.style.display = 'none';
    listElement.className = this.options.listClass;
    this.list.element = listElement;
    document.body.appendChild(listElement);
  } 

  function initializeEvents() {
    this.input.element.addEventListener('input', debounce(function(e) {
      var query = e.target.value.trim();
      if (this.input.query === query) {
        return;
      }
      this.input.query = query;
      if (query.length < this.options.minQueryLength) {
        clearList.call(this);
        return;
      }
      this.onSearchFn(query, function(err, addresses) {
        if (err) {
          console.error(err);
          return;
        }
        clearList.call(this);
        if (hasItems(addresses)) {
          this.list.addresses = addresses.slice(0, this.options.maxItems);
          populateList.call(this);
        }
      }.bind(this));
    }.bind(this), 100, false), true);

    this.input.element.addEventListener('keydown', function(e) {
      if (this.overrideKeys.indexOf(e.key) > -1) {
        switch (e.key) {
          case 'Enter':
            e.preventDefault();
            onEnter.call(this, e);
            break;
          case 'Tab':
            onTab.call(this, e);
            break;
          case 'ArrowDown':
            e.preventDefault();
            moveItemSelectionBy.call(this, 1);
            break;
          case 'ArrowUp':
            e.preventDefault();
            moveItemSelectionBy.call(this, -1);
            break;
          case 'Escape':
            e.preventDefault();
            reset.call(this);
            break;
          default:
            break;
        }
      }
    }.bind(this), true);
  }

  function onTab(e) {
    if (this.input.query && hasItems(this.list.addresses)) {
      e.preventDefault();
      moveItemSelectionBy.call(this, (e.shiftKey ? -1 : 1));
    }
  }

  function onEnter(e) {
    submitAddress.call(this);
  }

  function submitAddress() {
    if (this.list.selected >= 0) {
      var address = this.list.addresses[this.list.selected];
      reset.call(this);
      this.onAddressFn(address);
    }
  }

  function moveItemSelectionBy(step) {
    var len = this.list.addresses.length;
    if (len < 2) {
      return;
    }
    var select = (this.list.selected + step) % len;
    if (select < 0) {
      select += len;
    }
    selectItem.call(this, select);
  }

  function populateList() {
    var item;
    var len = this.list.addresses.length;
    if (this.list.addresses) {
      this.list.addresses.forEach(function(address, index) {
        item = document.createElement('div');
        item.innerHTML = address.label;
        item.onclick = function() {
          selectItem.call(this, index);
          submitAddress.call(this);
        }.bind(this);
        item.className = this.options.itemClass;
        this.list.element.appendChild(item);
      }, this);
      selectItem.call(this, 0);
      var inputPosition = this.input.element.getBoundingClientRect();
      this.list.element.style.left = inputPosition.left + 'px';
      this.list.element.style.top = inputPosition.bottom + 'px';
      this.list.element.style['min-width'] = inputPosition.width + 'px';
      this.list.element.style.display = 'block';
    }
  }

  function selectItem(index) {
    var prev = this.list.selected;
    if (prev !== index) {
      var items = this.list.element.getElementsByTagName('div');
      for (var i = 0, len = items.length; i < len; i++) {
        if (i !== prev && i !== index) {
          continue;
        }
        if (i === prev) {
          items[i].className = this.options.itemClass;
        } else {
          items[i].className = this.options.itemClass + ' ' + this.options.selectedItemClass;
        }
      }
      this.list.selected = index;
    }
  }

  function clearList() {
    this.list.element.style.display = 'none';
    this.list.element.innerHTML = '';
    this.list.addresses.length = 0;
    this.list.selected = -1;
  }

  function reset() {
    clearList.call(this);
    this.input.element.value = '';
    this.input.query = '';
    this.input.element.focus();
  }

  function extendDefaults(source, properties) {
    if (!properties || typeof properties !== 'object') {
      return source;
    }
    var property;
    for (property in properties) {
      if (properties.hasOwnProperty(property)) {
        source[property] = properties[property];
      }
    }
    return source;
  }

  function hasItems(arr) {
    return typeof arr !== 'undefined' && arr !== null && arr.length > 0;
  }

  function debounce(func, wait, immediate) {
    var timeout;
    return function() {
      var context = this, args = arguments;
      var later = function() {
        timeout = null;
        if (!immediate) func.apply(context, args);
      };
      var callNow = immediate && !timeout;
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
      if (callNow) func.apply(context, args);
    };
  }

  function addDefaultStyles() {
    var style = document.createElement('style');
    document.head.insertBefore(style, document.head.firstChild);
    var list = '.' + this.options.listClass;
    var item = '.' + this.options.itemClass;
    var selectedItem = '.' + this.options.selectedItemClass;
    style.sheet.insertRule(list + ' { background-color: #fff; padding: 5px 5px; border: 1px solid gray }', 0);
    style.sheet.insertRule(item + ' { cursor: default; }', 1);
    style.sheet.insertRule(item + ':hover { background-color: #eee }', 2);
    style.sheet.insertRule(selectedItem + ' { background-color: #eee; }', 3);
  }

}());

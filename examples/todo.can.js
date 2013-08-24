/* -*- js2-basic-offset: 2; indent-tabs-mode: nil; -*- */
/*global define, window */
/*jshint newcap:false */
/*
 * Based on
 * https://github.com/tastejs/todomvc/blob/gh-pages/labs/dependency-examples/canjs_require/js/models/todo.js
 */
define([
  'genfun',
  'can/util/library',
  'can/control',
  'can/model'
], function (Genfun, can, Control, Model) {
  'use strict';

  // In something like can/control/genfun
  can.init = new Genfun();
  can.destroy = new Genfun();
  can.onEvent = function(pattern) {
    var event = can.computeEvent(pattern),
        method = Genfun.addMethod.apply(
          [event.handler].concat([].slice(arguments, 1)));
    can.listenToEvent(method.spec[0], event);
  };

  /*
   * Imports
   */
  var addMethod = Genfun.addMethod,
      onEvent = can.onEvent,
      destroy = Control.destroy,
      save = Control.save,
      attr = Control.attr,
      push = can.push,
      each = can.each;
      
  var ENTER_KEY = 13,
      TodosConstructor = Control.extend({
	    defaults: {
	      view: 'views/todos.ejs'
	    }
      }),
      Todos = Todos.prototype;
  
  addMethod(Control.init, "after", [Todos], function(todo) {
    todo.element.append(can.view(todo.options.view, {
      todos: todo.options.todos
    }));
  });

  onEvent("{Model} created", [Todos], function(todo, list, e, item) {
    push(todo.options.todos, item);
    attr(todo.options.state, {filter: ""});
  });

  onEvent("#new-todo keyup", [Todos], function(todo, el, ev) {
	var value = can.trim(el.val());
	if (ev.which === ENTER_KEY && value !== '') {
	  save(new todo.options.Model({
		text: value,
		complete: false
	  }, _.bind(el.val, el, "")));
	}
  });

  onEvent("{state} filter", [Todos], function(todo, state, event, filter) {
    attr(todo.options.todos, { filter: filter || "" });
	todo.element.find('#filters a')
      .removeClass('selected')
      .filter('[href="' + window.location.hash + '"]')
      .addClass("selected");
  });

  onEvent(".todo dblclick", [Todos], function(todo, el) {
    save(
      attr(el.data("todo"), { editing: true }),
      function() {
	    el.children('.edit').focus();
	  });
  });

  onEvent(".todo .edit keyup", [Todos], function(todo, el, e) {
    if (e.which === ENTER_KEY) {
      updateTodo(todo, el);
    }
  });

  onEvent(".todo .edit focusout", [Todos], updateTodo);

  onEvent(".todo .toggle click", [Todos], function(todo, el) {
    save(
      attr(
        el.closest('.todo').data('todo'),
        { complete: el.is("checked") }));
  });

  onEvent(".todo .destroy click", [Todos], function(todo, el) {
    destroy(el.closest(".todo").data("todo"));
  });

  onEvent("#toggle-all click", [Todos], function(todo, el) {
	var toggle = el.prop('checked');
	each(todo.options.todos, function (todoModel) {
      save(attr(todoModel, { complete: toggle }));
	});
  });

  onEvent("#clear-completed click", [Todos], function(todo) {
    each(_.filter(todo.options.todos, "completed"), destroy);
  });

  function updateTodo(control, el) {
	var todo = el.closest('.todo').data('todo'),
	    value = can.trim(el.val());
	if (todo) {
	  if (!value) {
        destroy(todo);
	  } else {
        save(attr(todo, {
		  editing: false,
		  text: value
	    }));
      }
	}
  }

  return TodosConstructor;
});

import { moduleForComponent, test } from "ember-qunit";
import hbs from "htmlbars-inline-precompile";

moduleForComponent("pilas-boton-interruptor", "Integration | Component | pilas boton interruptor", {
  integration: true
});

test("it renders", function(assert) {
  this.render(hbs`{{pilas-boton-interruptor}}`);

  assert.equal(
    this.$()
      .text()
      .trim(),
    ""
  );
});

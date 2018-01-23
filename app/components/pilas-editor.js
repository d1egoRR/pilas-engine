import Component from "@ember/component";
import Ember from "ember";
import estados from "../estados/estados-de-pilas-editor";
import aplicarNombre from "../utils/aplicar-nombre";
import obtenerNombreSinRepetir from "../utils/obtener-nombre-sin-repetir";

export default Component.extend({
  bus: Ember.inject.service(),
  log: Ember.inject.service(),
  compilador: Ember.inject.service(),
  foco: Ember.inject.service(),
  codigo: "",
  tagName: "",
  actorSeleccionado: -1, //deprecated
  seleccion: -1,
  instanciaDeActorSeleccionado: null,
  cargando: true,

  historiaPosicion: 10,
  historiaMinimo: 0,
  historiaMaximo: 10,

  lista_de_eventos: ["finalizaCarga", "moverActor", "comienzaAMoverActor", "iniciaModoDepuracionEnPausa", "cuandoCambiaPosicionDentroDelModoPausa"],

  didInsertElement() {
    this.set("estado", new estados.ModoCargando());
    this.conectar_eventos();

    if (this.get("seleccion") != -1) {
      this.send("cuandoSelecciona", this.get("seleccion"));
    }

    document.addEventListener("keydown", this.alPulsarTecla.bind(this));

    this.get("foco").conectarFunciones(
      () => {
        this.get("bus").trigger("hacerFocoEnPilas", {});
      },
      () => {
        this.get("bus").trigger("hacerFocoEnElEditor", {});
      }
    );
  },

  alPulsarTecla(/*evento*/) {},

  willDestroyElement() {
    this.desconectar_eventos();
    document.removeEventListener("keydown", this.alPulsarTecla);
    this.get("foco").limpiar();
  },

  conectar_eventos() {
    this.get("lista_de_eventos").map(evento => {
      this.get("bus").on(evento, this, evento);
    });
  },

  desconectar_eventos() {
    this.get("lista_de_eventos").map(evento => {
      this.get("bus").off(evento, this, evento);
    });
  },

  finalizaCarga() {
    this.set("cargando", false);
    this.mostrarEscenaActualSobrePilas();
    this.set("estado", this.get("estado").cuandoTerminoDeCargarPilas());
  },

  moverActor(datos) {
    let escena = this.obtenerEscenaActual();
    let actor = escena.actores.findBy("id", datos.id);

    actor.set("x", datos.x);
    actor.set("y", datos.y);

    this.get("log").grupo(
      "Cambió la posición del actor desde el editor:",
      `
      let actor = pilas.obtener_actor(${datos.id});
      actor.x = ${Math.round(datos.x)};
      actor.y = ${Math.round(datos.y)};
    `
    );
  },

  comienzaAMoverActor(datos) {
    this.send("cuandoSelecciona", datos.id);
  },

  iniciaModoDepuracionEnPausa(datos) {
    this.set("historiaPosicion", datos.posicion);
    this.set("historiaMinimo", datos.minimo);
    this.set("historiaMaximo", datos.maximo);
  },

  cuandoCambiaPosicionDentroDelModoPausa(datos) {
    this.set("historiaPosicion", datos.posicion);
  },

  mostrarEscenaActualSobrePilas() {
    let escena = this.obtenerEscenaActual();
    let escenaComoJSON = JSON.parse(JSON.stringify(escena));
    this.get("bus").trigger("cargarEscena", { escena: escenaComoJSON });
  },

  obtenerEscenaActual() {
    let indice = this.get("ultimaEscenaSeleccionada");
    return this.get("proyecto.escenas").findBy("id", indice);
  },

  registrar_codigo(tipo, codigo) {
    let proyecto = this.get("proyecto");

    proyecto.codigos.actores.pushObject(
      Ember.Object.create({
        tipo: tipo,
        codigo: aplicarNombre(tipo, codigo)
      })
    );
  },

  obtenerCodigoTypescript() {
    let proyecto = this.get("proyecto");
    return proyecto.codigos.actores.map(e => e.codigo).join("\n");
  },

  generarID() {
    return Math.floor(Math.random() * 999) + 1000;
  },

  obtenerTipoDeActor(tipoDelActor) {
    return this.get("proyecto.codigos.actores").findBy("tipo", tipoDelActor);
  },

  obtenerDetalleDeActorPorIndice(indice) {
    let escena = this.obtenerEscenaActual();
    let actor = escena.get("actores").findBy("id", indice);
    return actor;
  },

  obtenerDetalleDeEscenaPorIndice(indice) {
    return this.get("proyecto.escenas").findBy("id", indice);
  },

  guardar_codigo_en_el_proyecto(seleccion, codigo) {
    let actor = this.obtenerDetalleDeActorPorIndice(seleccion);

    if (actor) {
      this.definir_codigo_para_el_actor(actor, codigo);
    } else {
      let escena = this.obtenerDetalleDeEscenaPorIndice(seleccion);
      this.definir_codigo_para_la_escena(escena, codigo);
    }
  },

  obtener_nombres_de_actores(escena) {
    return escena.actores.map(e => e.tipo);
  },

  obtener_codigo_para_la_escena({ nombre }) {
    return this.get("proyecto.codigos.escenas").findBy("nombre", nombre).codigo;
  },

  obtener_codigo_para_el_actor({ tipo }) {
    return this.obtenerTipoDeActor(tipo).get("codigo");
  },

  definir_codigo_para_la_escena({ nombre }, codigo) {
    this.get("proyecto.codigos.escenas")
      .findBy("nombre", nombre)
      .set("codigo", codigo);
  },

  definir_codigo_para_el_actor({ tipo }, codigo) {
    this.obtenerTipoDeActor(tipo).set("codigo", codigo);
  },

  actions: {
    agregarEscena(model) {
      model.escenas.pushObject(
        Ember.Object.create({
          id: this.generarID(),
          nombre: "demo",
          actores: []
        })
      );
    },
    agregarActor(proyecto, actor) {
      let escena = this.obtenerEscenaActual();
      let nombres = this.obtener_nombres_de_actores(escena);
      let id = this.generarID();
      let nombre = obtenerNombreSinRepetir(nombres, actor.tipo);

      escena.actores.pushObject(
        Ember.Object.create({
          id: id,
          x: 100,
          y: 100,
          centro_x: 0.5,
          centro_y: 0.5,
          tipo: nombre,
          imagen: actor.imagen
        })
      );

      this.registrar_codigo(nombre, actor.codigo);

      this.send("cuandoSelecciona", id);
      this.set("mostrarModalCreacionDeActor", false);

      this.mostrarEscenaActualSobrePilas();
    },
    definirEscena(indiceDeEscena) {
      console.warn("Deprecated: definirEscena");
      if (indiceDeEscena != this.get("escenaActual")) {
        this.set("actorSeleccionado", -1);
        this.set("escenaActual", indiceDeEscena);
        this.mostrarEscenaActualSobrePilas();
      }
    },
    seleccionarActor(indiceDelActor) {
      console.warn("Deprecated: seleccionarActor");
      let actor = this.obtenerDetalleDeActorPorIndice(indiceDelActor);

      if (actor) {
        this.set("actorSeleccionado", indiceDelActor);
        this.set("instanciaActorSeleccionado", actor);
        let tipoDeActor = this.obtenerTipoDeActor(actor.tipo);

        this.set("codigo", tipoDeActor.get("codigo"));
        this.set("tituloDelCodigo", actor.tipo);
      } else {
        this.set("actorSeleccionado", -1);
        this.set("instanciaActorSeleccionado", null);
      }
    },
    cuandoCargaMonacoEditor() {},
    cuandoCambiaElCodigo(codigo) {
      this.set("codigo", codigo);
      this.guardar_codigo_en_el_proyecto(this.get("seleccion"), codigo);
    },
    ejecutar() {
      this.set("estado", this.get("estado").ejecutar());

      let escena = this.obtenerEscenaActual();
      let escenaComoJSON = JSON.parse(JSON.stringify(escena));

      let codigoTypescript = this.obtenerCodigoTypescript();
      let resultado = this.get("compilador").compilar(codigoTypescript);

      this.get("bus").trigger("ejecutarEscena", { codigo: resultado.codigo, escena: escenaComoJSON });
      this.get("foco").hacerFocoEnPilas();
      this.get("log").limpiar();
      this.get("log").info("Ingresando en modo ejecución");
    },
    detener() {
      this.mostrarEscenaActualSobrePilas();
      this.set("estado", this.get("estado").detener());
      this.get("foco").hacerFocoEnElEditor();
      this.get("log").limpiar();
      this.get("log").info("Ingreando al modo edición");
    },
    pausar() {
      this.set("estado", this.get("estado").pausar());
      this.get("bus").trigger("pausarEscena", {});
      this.get("foco").hacerFocoEnPilas();
      this.get("log").limpiar();
      this.get("log").info("Ingresando en modo pausa");
    },
    cambiarPosicion(valorNuevo) {
      this.set("posicion", valorNuevo);
      this.get("bus").trigger("cambiarPosicionDesdeElEditor", {
        posicion: valorNuevo
      });
    },
    cuandoGuardaDesdeElEditor(/*editor*/) {
      this.send("alternarEstadoDeEjecucion");
    },
    alternarEstadoDeEjecucion() {
      let estado = this.get("estado");

      if (estado.puedeEjecutar) {
        this.send("ejecutar");
      } else {
        if (estado.puedeDetener) {
          this.send("detener");
        }
      }
    },
    cuandoSelecciona(seleccion) {
      this.set("seleccion", seleccion);

      let actor = this.obtenerDetalleDeActorPorIndice(seleccion);

      if (actor) {
        this.set("instanciaActorSeleccionado", actor);
        this.set("codigo", this.obtener_codigo_para_el_actor(actor));
        this.set("tituloDelCodigo", `Código del actor: ${seleccion}`);
      } else {
        let escena = this.obtenerDetalleDeEscenaPorIndice(seleccion);
        this.set("ultimaEscenaSeleccionada", seleccion);
        this.mostrarEscenaActualSobrePilas();

        this.set("codigo", this.obtener_codigo_para_la_escena(escena));
        this.set("tituloDelCodigo", `Código de la escena: ${seleccion}`);
      }

      this.get("bus").trigger("selecciona_actor_desde_el_editor", {
        id: seleccion
      });
    }
  }
});

from transformers import Mistral3ForConditionalGeneration as Mistral3ConditionalModel, Mistral3Model

from .._mixin import OstrisTransformersMixin


class Mistral3TextEncoder(Mistral3ConditionalModel, OstrisTransformersMixin):
    """Mistral3 conditioning stack (flux2)."""

    aitk_subfolder = "text_encoder"
    aitk_tokenizer_subfolder = "tokenizer"

    @classmethod
    def get_transformer_block_names(cls):
        return ["model.language_model.layers", "language_model.model.layers"]


class Mistral3ModelEncoder(Mistral3Model, OstrisTransformersMixin):
    """The inner Mistral3 base model (ernie_image's text encoder)."""

    aitk_subfolder = "text_encoder"
    aitk_tokenizer_subfolder = "tokenizer"

    @classmethod
    def get_transformer_block_names(cls):
        return ["language_model.layers"]

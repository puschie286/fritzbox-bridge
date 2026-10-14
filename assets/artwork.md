# Driver artwork

Driver images are supplied as opaque PNGs on white backgrounds at 75 × 75 and
500 × 500 pixels. Existing driver identifiers, manifest paths and app images are
unchanged. Universal and Blind have new, original SVG line icons with transparent
960 × 960 canvases; the other driver icons are retained.

## Product photo references

| Driver | Photo reference and source credit | Preparation |
| --- | --- | --- |
| FRITZ!Box | FRITZ!/AVM: [FRITZ!Box 7590 AX cutout](https://about-backend.fritz.com/pressimages/en/FRITZBox/AVM_FRITZBox_7590_AX_freigestellt.png) from the [official press library](https://about.fritz.com/en/press/images-and-videos) | Original product cutout fitted onto white |
| Universal | FRITZ!/AVM: [DECT 200](https://about-backend.fritz.com/pressimages/en/FRITZDECT/AVM_FRITZDECT_200_freigestellt.png), [Thermo 302](https://fritz.com/en/products/fritz-smart-thermo-302-20003120) and [DECT 500](https://about-backend.fritz.com/pressimages/en/FRITZDECT/AVM_FRITZDECT_500_vorne_freigestellt.png) | Photo reference group assembled with the built-in image tool |
| Plug | FRITZ!/AVM: [Smart Energy 200 product photo](https://cdn.shopify.com/s/files/1/0912/6595/8229/files/fritzsmart_energy_200_2000x2000px.webp?v=1782921260) from the [product page](https://fritz.com/en/products/fritz-smart-energy-200-20003113) | Blue background replaced with white using the built-in image tool |
| Socket | FRITZ!/AVM: [DECT 210 product photo](https://cdn.shopify.com/s/files/1/0912/6595/8229/files/fritzdect_210_2000x2000px.webp?v=1782920764) | Blue background replaced with white using the built-in image tool |
| Energy meter | FRITZ!/AVM: [DECT 200 cutout](https://about-backend.fritz.com/pressimages/en/FRITZDECT/AVM_FRITZDECT_200_freigestellt.png) | Original product cutout fitted onto white |
| Thermostat | FRITZ!/AVM: [Smart Thermo 302 product photo](https://cdn.shopify.com/s/files/1/0912/6595/8229/files/fritzsmart_thermo_302_2000x2000px.webp?v=1782921307) | Blue background replaced with white using the built-in image tool |
| Temperature sensor | FRITZ!/AVM: [Smart Control 440 product photo](https://cdn.shopify.com/s/files/1/0912/6595/8229/files/fritzsmart_control_440_2000x2000px.webp?v=1782921251) | Blue background replaced with white using the built-in image tool |
| Alarm sensor | Telekom Deutschland: [motion detector 40318650 photo hosted by Idealo](https://cdn.idealo.com/folder/Product/5565/2/5565252/s1_produktbild_max_5/telekom-smart-home-bewegungsmelder-40318650.jpg); [official motion detector guide](https://www.telekom.de/pdf/kurzanleitung-bewegungsmelder-online.pdf) | Black background replaced with white using the built-in image tool; representative HAN-FUN motion detector |
| Blind | DELTA DORE RADEMACHER: [RolloTron DECT product photo hosted by Notebooksbilliger](https://media2.nbb-cdn.de/images/products/RolloTron_DECT_03_9b5e.png); [official manual index](https://www.rademacher.de/manuals/rollotron) | Original product cutout fitted onto white |

The HAN-FUN example identifies a motion detector profile, but does not identify a
retail model. The alarm driver image represents that device category.

## Image tool prompts

Mode: built-in `image_gen`, editing with local photo references and an opaque
background. Images were inspected against the supplied references, fitted onto
white canvases, and downscaled to the required sizes. Device pictures and vector
icons remain separate assets.

### White background for FRITZ! product photos

This prompt was used once for each subject listed below, with that subject in
place of `<subject>`:

> Use case: precise-object-edit. Asset: square Homey driver product photograph. Edit target: the supplied manufacturer photo of <subject>. Replace only the blue gradient background and its blue cast shadow with a perfectly flat opaque pure white #FFFFFF background. Keep the actual product identical: exact shape, materials, surfaces, perspective, every button/connector, branding, printed labels and display characters. Do not invent, redesign or simplify any part of the product. Keep the same viewing angle. Center the complete device, scale to occupy about 82% of the square while preserving aspect ratio, with safe white margins on every side. No extra objects, added words, border, graphic illustration, lifestyle scene or heavy drop shadow. Output a clean photographic catalog cutout on opaque white. This is background cleanup of a real product photo, not generation of a generic product.

- FRITZ!Smart Energy 200 smart plug
- FRITZ!DECT 210 outdoor socket with open red lid
- FRITZ!Smart Thermo 302 radiator thermostat
- FRITZ!Smart Control 440 sensor

### Alarm sensor background

> Use case: precise-object-edit. Edit target: supplied real Telekom HAN-FUN motion detector product photo. Prepare an accurate Homey driver image. Replace only the black background with perfectly flat opaque pure white #FFFFFF, center the complete product on a square white canvas with about 10% white margin at top/bottom. Preserve its exact rectangular rounded enclosure, viewing angle, subtle seams, house-shaped button, circular status LED, lower motion-sensor window, surface colors and proportions. Keep all product details identical; do not redesign, invent labels, or turn it into a stylized or generic illustration. No additional objects, words, border, watermark or heavy shadow. Product should be recognizable and all edges kept inside frame.

### Universal device group

References: DECT 200 product cutout, prepared Thermo 302 image, and DECT 500 product
cutout, in that order.

> Use case: compositing. Make one square Homey Universal driver image from the three supplied real product photo references. Image1 is the exact FRITZ!DECT 200 plug, Image2 the exact FRITZ!Smart Thermo 302 radiator thermostat, Image3 the exact FRITZ!DECT 500 color bulb. Arrange all THREE products together in a compact attractive catalogue group on a perfectly flat opaque pure white #FFFFFF background. Plug on the left, thermostat front middle, colorful bulb on the right. Keep each device complete, recognizable, distinct, and almost nonoverlapping; preserve exact shape, casing, display values, buttons, connectors and existing branding from its reference. Do not invent or substitute devices or alter their designs. Adjust relative scale and position only. Group fills approximately 85% canvas width and 72% height with balanced white margins, sits near visual center, and remains clear as a 75x75 thumbnail. Keep the existing colors including bulb multicolor glow. Tiny natural grounding shadows only. No added text, headings, arrows, linking lines, circles, scenery, illustrations, border or watermark. This is a group of actual supported products for a device picker, not generic AI concept art.

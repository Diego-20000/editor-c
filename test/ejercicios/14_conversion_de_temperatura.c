#include <stdio.h>

int main(void) {
    float CELSIUS, FAHRENHEIT, KELVIN;

    scanf("%f", &CELSIUS);
    FAHRENHEIT = CELSIUS * 9.0f / 5.0f + 32.0f;
    KELVIN = CELSIUS + 273.15f;

    printf("Fahrenheit: %5.2f\nKelvin: %5.2f\n", FAHRENHEIT, KELVIN);
    return 0;
}

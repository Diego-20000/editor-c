#include <stdio.h>

int main() {
    double CELSIUS;
    double FAHRENHEIT;

    CELSIUS = 0.0;
    FAHRENHEIT = 0.0;

    printf("Temperatura en Celsius: ");
    scanf("%lf", &CELSIUS);

    FAHRENHEIT = CELSIUS * 9.0 / 5.0 + 32.0;

    printf("Equivalente en Fahrenheit: %.2f\n", FAHRENHEIT);
}

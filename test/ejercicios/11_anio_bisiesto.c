#include <stdio.h>

int main(void) {
    int ANIO;

    scanf("%d", &ANIO);
    if (ANIO >= 1 && ANIO % 400 == 0) {
        printf("Bisiesto\n");
    } else if (ANIO >= 1 && ANIO % 100 == 0) {
        printf("No bisiesto\n");
    } else if (ANIO >= 1 && ANIO % 4 == 0) {
        printf("Bisiesto\n");
    } else {
        printf("No bisiesto\n");
    }

    return 0;
}

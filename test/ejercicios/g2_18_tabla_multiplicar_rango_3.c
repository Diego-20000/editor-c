#include <stdio.h>

int main() {
    int i;
    int NUMERO;
    int DESDE;
    int HASTA;
    int PRODUCTO;

    NUMERO = 0;
    DESDE = 0;
    HASTA = 0;
    PRODUCTO = 0;

    printf("Numero de la tabla: ");
    scanf("%d", &NUMERO);
    printf("Desde: ");
    scanf("%d", &DESDE);
    printf("Hasta: ");
    scanf("%d", &HASTA);

    if (DESDE > HASTA || DESDE < -100 || HASTA > 100 || NUMERO < -1000 || NUMERO > 1000) {
        printf("El numero o el rango no son validos.\n");
    } else {
        for (i = DESDE; i <= HASTA; i++) {
            PRODUCTO = NUMERO * i;
            printf("%d x %d = %d\n", NUMERO, i, PRODUCTO);
        }
    }
}

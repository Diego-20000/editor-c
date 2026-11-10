#include <stdio.h>

int main(void) {
    int MATRIZ[3][3], PRINCIPAL = 0, SECUNDARIA = 0;
    int FILA, COLUMNA;

    for (FILA = 0; FILA < 3; FILA++) {
        for (COLUMNA = 0; COLUMNA < 3; COLUMNA++) {
            scanf("%d", &MATRIZ[FILA][COLUMNA]);
            if (FILA == COLUMNA) PRINCIPAL += MATRIZ[FILA][COLUMNA];
            if (FILA + COLUMNA == 2) SECUNDARIA += MATRIZ[FILA][COLUMNA];
        }
    }

    printf("Diagonal principal: %d\nDiagonal secundaria: %d\n", PRINCIPAL, SECUNDARIA);
    if (PRINCIPAL > SECUNDARIA) printf("Es mayor la principal\n");
    else if (PRINCIPAL < SECUNDARIA) printf("Es mayor la secundaria\n");
    else printf("Las diagonales son iguales\n");
    return 0;
}

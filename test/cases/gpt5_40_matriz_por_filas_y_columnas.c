#include <stdio.h>
int main() {
    int M[2][3] = {{1, 2, 3}, {4, 5, 6}};
    int I, J;
    for (I = 0; I < 2; I++)
        for (J = 0; J < 3; J++)
            printf("%d ", M[I][J]);
    printf("\n");
    for (J = 0; J < 3; J++)
        for (I = 0; I < 2; I++)
            printf("%d ", M[I][J]);
    printf("\n%zu %zu\n", sizeof(M) / sizeof(M[0]),
           sizeof(M[0]) / sizeof(M[0][0]));
}

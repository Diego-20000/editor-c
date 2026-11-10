#include <stdio.h>
int main(void) {
    int A, B, I, S = 0;
    scanf("%d%d", &A, &B);
    for (I = A; I <= B; I++) S += I;
    printf("Suma: %d; control: %d\n", S, I);
    return 0;
}

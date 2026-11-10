#include <stdio.h>
int main(void) {
    int N, I, V = 0;
    scanf("%d", &N);
    for (I = 0; I < N; I++) V++;
    printf("Vueltas: %d\n", V);
    return 0;
}

#include <stdio.h>
int SIGUIENTE(void);
int main() {
    int A = SIGUIENTE();
    int B = SIGUIENTE();
    int C = SIGUIENTE();
    printf("%d %d %d\n", A, B, C);
}
int SIGUIENTE(void) {
    static int CONTADOR = 0;
    return ++CONTADOR;
}
